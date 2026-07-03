import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Leaderboard',
  description: 'View rankings, XP totals, levels, streak milestones, and achievement progress.',
  alternates: {
    canonical: '/dashboard/leaderboard',
  },
  robots: {
    index: false,
    follow: false,
  },
}

export default function LeaderboardLayout({ children }: { children: React.ReactNode }) {
  return children
}
