import { z } from 'zod'

export const LoginSchema = z.object({
  email: z.string().trim().email({ message: 'Please enter a valid email address.' }),
  password: z.string().min(1, { message: 'Password is required.' }),
})

export const RegisterSchema = z.object({
  name: z.string().trim().min(2, { message: 'Name must be at least 2 characters long.' }).max(50, { message: 'Name cannot exceed 50 characters.' }),
  email: z.string().trim().email({ message: 'Please enter a valid email address.' }),
  password: z.string().min(8, { message: 'Password must be at least 8 characters long.' }).max(128, { message: 'Password cannot exceed 128 characters.' }),
})

export const ForgotPasswordSchema = z.object({
  email: z.string().trim().email({ message: 'Please enter a valid email address.' }),
})

export const ResetPasswordSchema = z
  .object({
    password: z.string().min(8, { message: 'Password must be at least 8 characters long.' }).max(128, { message: 'Password cannot exceed 128 characters.' }),
    confirmPassword: z.string().min(8, { message: 'Please confirm your password.' }),
  })
  .superRefine(({ password, confirmPassword }, ctx) => {
    if (password !== confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Passwords do not match.',
        path: ['confirmPassword'],
      })
    }
  })
