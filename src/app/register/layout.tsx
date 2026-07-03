import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Create Account',
  description: 'Create a Solo Leveling account to start tracking tasks, habits, projects, notes, and personal progress.',
  alternates: {
    canonical: '/register',
  },
}

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children
}
