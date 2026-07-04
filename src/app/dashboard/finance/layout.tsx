import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Finance',
  description: 'Personal budget: log expenses and earnings, attach bills, and view analytics.',
  alternates: {
    canonical: '/dashboard/finance',
  },
  robots: {
    index: false,
    follow: false,
  },
}

export default function FinanceLayout({ children }: { children: React.ReactNode }) {
  return children
}
