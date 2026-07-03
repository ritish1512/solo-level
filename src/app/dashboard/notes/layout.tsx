import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Notes',
  description: 'Create searchable markdown notes, codebase guides, tags, pins, and archived knowledge.',
  alternates: {
    canonical: '/dashboard/notes',
  },
  robots: {
    index: false,
    follow: false,
  },
}

export default function NotesLayout({ children }: { children: React.ReactNode }) {
  return children
}
