import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Projects',
  description: 'Organize software projects, tasks, bugs, links, technology stacks, and screenshots.',
  alternates: {
    canonical: '/dashboard/projects',
  },
  robots: {
    index: false,
    follow: false,
  },
}

export default function ProjectsLayout({ children }: { children: React.ReactNode }) {
  return children
}
