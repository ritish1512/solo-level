'use client'

import React, { useState, useTransition } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card'
import { useToast } from '@/components/ui/Toast'
import { forgotPasswordAction } from '@/actions/authActions'
import { ForgotPasswordSchema } from '@/schemas/authSchemas'

export default function ForgotPasswordPage() {
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const result = ForgotPasswordSchema.safeParse({ email })
    if (!result.success) {
      setError(result.error.issues[0].message)
      return
    }
    setError('')

    startTransition(async () => {
      const res = await forgotPasswordAction({ email })
      if (res.success) {
        setSubmitted(true)
        toast(res.message || 'Recovery email sent.', 'success')
      } else {
        toast(res.error || 'Failed to send recovery email.', 'error')
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
            <CardTitle className="text-2xl font-bold text-center">Reset Password</CardTitle>
            <CardDescription className="text-center">
              {submitted
                ? "Check your inbox for a recovery link"
                : "Enter your email to receive a recovery link"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {submitted ? (
              <div className="text-center space-y-4 py-4">
                <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
                  We have sent a password reset link to <strong className="text-zinc-900 dark:text-white">{email}</strong>.
                  Please check your spam folder if you do not see it within a few minutes.
                </p>
                <Button
                  onClick={() => setSubmitted(false)}
                  variant="outline"
                  className="w-full"
                >
                  Resend recovery link
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      if (error) setError('')
                    }}
                    disabled={isPending}
                    className={error ? 'border-rose-500 focus-visible:ring-rose-500' : ''}
                  />
                  {error && <p className="text-xs text-rose-500 font-medium">{error}</p>}
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full mt-2"
                  isLoading={isPending}
                >
                  Send recovery link
                </Button>
              </form>
            )}
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
