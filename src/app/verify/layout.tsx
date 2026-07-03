import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Verify Email',
  description: 'Verify your email address to activate your Solo Leveling account.',
  alternates: {
    canonical: '/verify',
  },
  robots: {
    index: false,
    follow: false,
  },
}

export default function VerifyLayout({ children }: { children: React.ReactNode }) {
  return children
}
