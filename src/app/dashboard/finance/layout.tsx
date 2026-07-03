import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Finance',
  description: 'Track transactions, invoices, revenue, expenses, and secure payment workflows.',
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
