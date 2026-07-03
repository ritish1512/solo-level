import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'College',
  description: 'Manage college subjects, assignments, exams, credits, and academic planning.',
  alternates: {
    canonical: '/dashboard/college',
  },
  robots: {
    index: false,
    follow: false,
  },
}

export default function CollegeLayout({ children }: { children: React.ReactNode }) {
  return children
}
