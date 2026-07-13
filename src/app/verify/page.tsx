'use client'

import React, { Suspense, useEffect, useState, startTransition } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { verifyEmailAction } from '@/actions/authActions'

type Status = 'loading' | 'success' | 'error'

function VerifyStatus() {
  const searchParams = useSearchParams()

  const token = searchParams.get('token')
  const email = searchParams.get('email')

  const [status, setStatus] = useState<Status>(() => (token && email ? 'loading' : 'error'))
  const [message, setMessage] = useState(() => (
    token && email
      ? 'Verifying your email address...'
      : 'Invalid or missing verification details. Please verify your link.'
  ))

  useEffect(() => {
    if (!token || !email) {
      const frame = window.requestAnimationFrame(() => {
        setStatus('error')
        setMessage('Invalid or missing verification details. Please verify your link.')
      })
      return () => window.cancelAnimationFrame(frame)
    }

    startTransition(async () => {
      const res = await verifyEmailAction(token, email)
      if (res.success) {
        setStatus('success')
        setMessage(res.message || 'Your email has been verified successfully!')
      } else {
        setStatus('error')
        setMessage(res.error || 'Failed to verify email. The link may have expired.')
      }
    })
  }, [token, email])

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden">
      {/* Background Grids */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md z-10"
      >
        <Card className="border border-border bg-card/60 text-center">
          <CardHeader>
            <CardTitle className="text-2xl font-bold flex flex-col items-center gap-3">
              {status === 'loading' && <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />}
              {status === 'success' && <CheckCircle2 className="w-12 h-12 text-emerald-500" />}
              {status === 'error' && <XCircle className="w-12 h-12 text-rose-500" />}
              Email Verification
            </CardTitle>
            <CardDescription className="text-zinc-500 dark:text-zinc-400">
              {status === 'loading' ? 'Securing your profile...' : 'Process completed'}
            </CardDescription>
          </CardHeader>
          <CardContent className="py-4">
            <p className="text-zinc-600 dark:text-zinc-300 font-medium">
              {message}
            </p>
          </CardContent>
          <CardFooter className="flex justify-center border-t border-border/40 pt-4">
            {status === 'success' && (
              <Link href={`/login?email=${encodeURIComponent(email || '')}`} className="w-full">
                <Button variant="primary" className="w-full">
                  Go to Sign In
                </Button>
              </Link>
            )}
            {status === 'error' && (
              <Link href="/register" className="w-full">
                <Button variant="outline" className="w-full">
                  Back to Registration
                </Button>
              </Link>
            )}
            {status === 'loading' && (
              <Button variant="ghost" className="w-full" disabled>
                Processing...
              </Button>
            )}
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  )
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <VerifyStatus />
    </Suspense>
  )
}
