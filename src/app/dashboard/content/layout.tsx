import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Creator Hub',
  description: 'Plan content ideas, channels, formats, status, and batch production workflows.',
  alternates: {
    canonical: '/dashboard/content',
  },
  robots: {
    index: false,
    follow: false,
  },
}

export default function ContentLayout({ children }: { children: React.ReactNode }) {
  return children
}
