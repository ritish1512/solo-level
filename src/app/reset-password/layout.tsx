import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Reset Password',
  description: 'Set a new password for your Solo Leveling account.',
  alternates: {
    canonical: '/reset-password',
  },
  robots: {
    index: false,
    follow: false,
  },
}

export default function ResetPasswordLayout({ children }: { children: React.ReactNode }) {
  return children
}
