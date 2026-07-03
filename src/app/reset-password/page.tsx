'use client'

import React, { Suspense, useState, useTransition, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card'
import { useToast } from '@/components/ui/Toast'
import { resetPasswordAction } from '@/actions/authActions'
import { ResetPasswordSchema } from '@/schemas/authSchemas'

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()

  const token = searchParams.get('token')
  const email = searchParams.get('email')

  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  })
  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  useEffect(() => {
    if (!token || !email) {
      toast('Invalid or expired reset link. Please request a new one.', 'error')
      router.push('/forgot-password')
    }
  }, [token, email, router, toast])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors((prev) => {
        const copy = { ...prev }
        delete copy[name]
        return copy
      })
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!token || !email) return

    const result = ResetPasswordSchema.safeParse(formData)
    if (!result.success) {
      const fieldErrors: { [key: string]: string } = {}
      result.error.issues.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message
        }
      })
      setErrors(fieldErrors)
      return
    }

    startTransition(async () => {
      const res = await resetPasswordAction(formData, token, email)
      if (res.success) {
        toast(res.message || 'Password reset successful!', 'success')
        router.push(`/login?email=${encodeURIComponent(email)}`)
      } else {
        toast(res.error || 'Failed to reset password.', 'error')
      }
    })
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden">
      {/* Background Grids */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md z-10"
      >
        <Card className="border border-border bg-card/60">
          <CardHeader className="space-y-1">
            <div className="flex justify-center mb-2">
              <span className="font-bold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-indigo-300">
                SOLO LEVELING
              </span>
            </div>
            <CardTitle className="text-2xl font-bold text-center">New Password</CardTitle>
            <CardDescription className="text-center">
              Please enter your new password details
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="password">New Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  disabled={isPending}
                  className={errors.password ? 'border-rose-500 focus-visible:ring-rose-500' : ''}
                />
                {errors.password && <p className="text-xs text-rose-500 font-medium">{errors.password}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  disabled={isPending}
                  className={errors.confirmPassword ? 'border-rose-500 focus-visible:ring-rose-500' : ''}
                />
                {errors.confirmPassword && (
                  <p className="text-xs text-rose-500 font-medium">{errors.confirmPassword}</p>
                )}
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full mt-2"
                isLoading={isPending}
              >
                Reset Password
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex justify-center border-t border-border/40 pt-4 text-sm text-zinc-500 dark:text-zinc-400">
            <Link href="/login" className="text-indigo-500 hover:text-indigo-400 font-semibold hover:underline">
              Back to Sign In
            </Link>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <ResetPasswordForm />
    </Suspense>
  )
}
