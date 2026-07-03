import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import bcrypt from 'bcrypt'
import dbConnect from './mongodb'
import User from '@/models/User'

export const authOptions: NextAuthOptions = {
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
          throw new Error('Email and password are required')
        }

        await dbConnect()

        const user = await User.findOne({ email: credentials.email.toLowerCase() })

        if (!user) {
          throw new Error('No user found with this email')
        }

        if (user.status === 'suspended') {
          throw new Error('This account has been suspended. Please contact support.')
        }

        if (!user.password) {
          throw new Error(
            'This account uses a different login method. Try signing in with Google.'
          )
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password)

        if (!isPasswordValid) {
          throw new Error('Incorrect password')
        }

        if (!user.emailVerified) {
          throw new Error('UNVERIFIED: Please verify your email before logging in.')
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
          // Create user if they don't exist
          const newUser = await User.create({
            name: profile?.name || user.name || 'Google User',
            email: profile?.email?.toLowerCase(),
            image: (profile?.image || user.image || undefined) as string | undefined,
            emailVerified: new Date(), // Google emails are already verified
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
          
          // If the existing user was registered via credentials but hadn't verified their email,
          // logging in via Google confirms they own the email address.
          if (!existingUser.emailVerified) {
            existingUser.emailVerified = new Date()
            await existingUser.save()
          }
        }
      }
      return true
    },
        async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id
        token.email = user.email
        token.name = user.name
        token.image = user.image
        token.role = user.role
        // ✅ Return immediately on login so it skips the heavy DB fetch below
        return token 
      }
      
      // Update session info dynamically if triggered
      if (trigger === 'update' && session) {
        token.name = session.name || token.name
        token.image = session.image || token.image
      }

      // Periodically refresh the user's role/details from DB in JWT
      // ✅ Only run if token.id exists to prevent a hanging query on undefined IDs
      if (token.id) {
        try {
          await dbConnect()
          // Using lean() makes Mongoose return plain objects, speeding up the execution
          const dbUser = await User.findById(token.id).select('role name image email').lean()
          if (dbUser) {
            token.role = dbUser.role
            token.name = dbUser.name
            token.image = dbUser.image
            token.email = dbUser.email
          }
        } catch (error) {
          console.error("Failed to refresh JWT user data:", error)
        }
      }

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
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
}
