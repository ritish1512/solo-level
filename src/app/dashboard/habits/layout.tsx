import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Habits',
  description: 'Track habit streaks, consistency, and daily completion momentum.',
  alternates: {
    canonical: '/dashboard/habits',
  },
  robots: {
    index: false,
    follow: false,
  },
}

export default function HabitsLayout({ children }: { children: React.ReactNode }) {
  return children
}
