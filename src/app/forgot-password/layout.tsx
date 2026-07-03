import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Forgot Password',
  description: 'Request a secure password reset link for your Solo Leveling account.',
  alternates: {
    canonical: '/forgot-password',
  },
  robots: {
    index: false,
    follow: true,
  },
}

export default function ForgotPasswordLayout({ children }: { children: React.ReactNode }) {
  return children
}
