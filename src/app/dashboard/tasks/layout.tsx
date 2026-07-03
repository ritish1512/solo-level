import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Tasks',
  description: 'Plan, filter, and complete daily tasks by priority, difficulty, energy, category, and deadline.',
  alternates: {
    canonical: '/dashboard/tasks',
  },
  robots: {
    index: false,
    follow: false,
  },
}

export default function TasksLayout({ children }: { children: React.ReactNode }) {
  return children
}
