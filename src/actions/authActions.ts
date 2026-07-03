'use server'

import crypto from 'crypto'
import bcrypt from 'bcrypt'
import dbConnect from '@/lib/mongodb'
import User from '@/models/User'
import { RegisterSchema, ForgotPasswordSchema, ResetPasswordSchema } from '@/schemas/authSchemas'
import { sendVerificationEmail, sendResetPasswordEmail } from '@/services/emailService'

export async function signUpAction(data: any): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    // Validate inputs
    const validated = RegisterSchema.safeParse(data)
    if (!validated.success) {
      return { success: false, error: validated.error.issues[0].message }
    }

    const { name, email, password } = validated.data
    const lowercaseEmail = email.toLowerCase()

    await dbConnect()

    // Check if user already exists
    const existingUser = await User.findOne({ email: lowercaseEmail })
    if (existingUser) {
      if (existingUser.password) {
        return { success: false, error: 'An account with this email already exists.' }
      } else {
        return {
          success: false,
          error: 'This email is registered via Google. Please log in using Google.',
        }
      }
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Generate email verification token
    const verificationToken = crypto.randomBytes(32).toString('hex')
    const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    // Create user with default role: 'user'
    // If the email is the user's first registered admin email, the role can be set to 'admin' manually in DB later.
    // However, to make it easier for testing, if the email matches a pre-defined admin email in ENV, we can set it to 'admin'.
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@sololeveling.com'
    const role = lowercaseEmail === adminEmail.toLowerCase() ? 'admin' : 'user'

    await User.create({
      name,
      email: lowercaseEmail,
      password: hashedPassword,
      role,
      verificationToken,
      verificationTokenExpiry,
      emailVerified: null,
      xp: 0,
      level: 1,
      streak: 0,
      longestStreak: 0,
    })

    // Send verification email
    await sendVerificationEmail(lowercaseEmail, name, verificationToken)

    return {
      success: true,
      message: 'Account created! A verification link has been sent to your email address.',
    }
  } catch (error: any) {
    console.error('Registration Error:', error)
    return { success: false, error: error.message || 'Something went wrong. Please try again.' }
  }
}

export async function verifyEmailAction(token: string, email: string): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    if (!token || !email) {
      return { success: false, error: 'Invalid verification request.' }
    }

    await dbConnect()

    const user = await User.findOne({
      email: email.toLowerCase(),
      verificationToken: token,
      verificationTokenExpiry: { $gt: new Date() },
    })

    if (!user) {
      return {
        success: false,
        error: 'The verification link is invalid or has expired. Please register again.',
      }
    }

    user.emailVerified = new Date()
    user.verificationToken = null
    user.verificationTokenExpiry = null
    await user.save()

    return {
      success: true,
      message: 'Your email has been successfully verified! You can now log in.',
    }
  } catch (error: any) {
    console.error('Email Verification Error:', error)
    return { success: false, error: error.message || 'Failed to verify email.' }
  }
}

export async function forgotPasswordAction(data: any): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    // Validate inputs
    const validated = ForgotPasswordSchema.safeParse(data)
    if (!validated.success) {
      return { success: false, error: validated.error.issues[0].message }
    }

    const { email } = validated.data
    const lowercaseEmail = email.toLowerCase()

    await dbConnect()

    const user = await User.findOne({ email: lowercaseEmail })

    // For security, do not disclose if the email exists or not.
    // Simply say that if it exists, an email has been sent.
    const successResult = {
      success: true,
      message: 'If this email exists in our system, we have sent a reset password link.',
    }

    if (!user || !user.password) {
      // If user doesn't exist or is Google OAuth only (no password)
      return successResult
    }

    // Generate reset password token
    const resetPasswordToken = crypto.randomBytes(32).toString('hex')
    const resetPasswordTokenExpiry = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    user.resetPasswordToken = resetPasswordToken
    user.resetPasswordTokenExpiry = resetPasswordTokenExpiry
    await user.save()

    // Send reset password email
    await sendResetPasswordEmail(lowercaseEmail, user.name, resetPasswordToken)

    return successResult
  } catch (error: any) {
    console.error('Forgot Password Error:', error)
    return { success: false, error: error.message || 'Something went wrong.' }
  }
}

export async function resetPasswordAction(data: any, token: string, email: string): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    if (!token || !email) {
      return { success: false, error: 'Invalid reset request.' }
    }

    // Validate inputs
    const validated = ResetPasswordSchema.safeParse(data)
    if (!validated.success) {
      return { success: false, error: validated.error.issues[0].message }
    }

    const { password } = validated.data

    await dbConnect()

    const user = await User.findOne({
      email: email.toLowerCase(),
      resetPasswordToken: token,
      resetPasswordTokenExpiry: { $gt: new Date() },
    })

    if (!user) {
      return {
        success: false,
        error: 'The reset link is invalid or has expired. Please request a new link.',
      }
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 12)

    user.password = hashedPassword
    user.resetPasswordToken = null
    user.resetPasswordTokenExpiry = null
    await user.save()

    return {
      success: true,
      message: 'Your password has been successfully reset! You can now log in.',
    }
  } catch (error: any) {
    console.error('Reset Password Error:', error)
    return { success: false, error: error.message || 'Failed to reset password.' }
  }
}
