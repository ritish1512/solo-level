import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import { CredentialsSignin } from 'next-auth' // <-- IMPORTANT: Import this class
import bcrypt from 'bcrypt'
import dbConnect from './mongodb'
import User from '@/models/User'

// Create a reusable helper to throw compliant errors with custom messages
class CustomAuthError extends CredentialsSignin {
  constructor(message: string, code?: string) {
    super()
    this.message = message
    // You can attach custom codes if needed; defaults to "credentials"
    if (code) this.code = code 
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new CustomAuthError('Email and password are required')
        }

        await dbConnect()

        const user = await User.findOne({ email: (credentials.email as string).toLowerCase() })

        // Replaced generic throws with CustomAuthError instances
        if (!user) {
          throw new CustomAuthError('No user found with this email')
        }

        if (user.status === 'suspended') {
          throw new CustomAuthError('This account has been suspended. Please contact support.')
        }

        if (!user.password) {
          throw new CustomAuthError(
            'This account uses a different login method. Try signing in with Google.'
          )
        }

        const isPasswordValid = await bcrypt.compare(credentials.password as string, user.password)

        if (!isPasswordValid) {
          throw new CustomAuthError('Incorrect password')
        }

        if (!user.emailVerified) {
          throw new CustomAuthError('UNVERIFIED: Please verify your email before logging in.')
        }

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
        }
      },
    }),
  ],
    callbacks: {
    async signIn({ account, profile, user }) {
      if (account?.provider === 'google') {
        await dbConnect()
        const existingUser = await User.findOne({ email: profile?.email?.toLowerCase() })

        if (existingUser && existingUser.status === 'suspended') {
          throw new Error('This account has been suspended. Please contact support.')
        }

        if (!existingUser) {
          const newUser = await User.create({
            name: profile?.name || user.name || 'Google User',
            email: profile?.email?.toLowerCase(),
            image: (profile?.picture || user.image || undefined) as string | undefined,
            emailVerified: new Date(),
            role: 'user',
            xp: 0,
            level: 1,
            streak: 0,
            longestStreak: 0,
          })
          user.id = newUser._id.toString()
          user.role = newUser.role
        } else {
          user.id = existingUser._id.toString()
          user.role = existingUser.role
          
          if (!existingUser.emailVerified) {
            existingUser.emailVerified = new Date()
            await existingUser.save()
          }
        }
      }
      return true
    },
    async jwt({ token, user, trigger, session }) {
      // Runs only on initial login/sign-in
      if (user) {
        token.id = user.id as string
        token.email = (user.email as string) || ""
        token.name = user.name as string
        token.image = user.image as string
        token.role = (user as any).role 
        return token 
      }
      
      // Runs when you programmatically fire a user details update trigger
      if (trigger === 'update' && session) {
        token.name = session.name || token.name
        token.image = session.image || token.image
      }

      // FIX: Removed the massive MongoDB findById lookup loop here to keep production lightning fast.
      // Roles are natively carried from the step above inside your secure JWT session token directly.

      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.email = token.email as string
        session.user.name = token.name as string
        session.user.image = token.image as string
        session.user.role = token.role as 'user' | 'admin'
      }
      return session
    },
  },

  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 365 * 24 * 60 * 60, // 365 days (1 year)
    updateAge: 24 * 60 * 60, // 24 hours
  },
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === 'production' ? '__Secure-authjs.session-token' : 'authjs.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 365 * 24 * 60 * 60, // 365 days (1 year)
      },
    },
  },
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
})
