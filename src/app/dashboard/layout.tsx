import React from 'react'
import type { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/dashboard/Sidebar'

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Your Solo Leveling command center for tasks, habits, projects, notes, college work, and finances.',
  alternates: {
    canonical: '/dashboard',
  },
  robots: {
    index: false,
    follow: false,
  },
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login?error=Please%20log%20in%20to%20access%20the%20dashboard.')
  }

  return (
    <div className="flex min-h-dvh overflow-x-hidden bg-background text-foreground">
      {/* Sidebar navigation */}
      <Sidebar />

      {/* Main workspace */}
      <div className="relative flex min-w-0 flex-1 flex-col md:h-screen md:overflow-hidden">
        {/* Glow effect in background */}
        <div className="pointer-events-none absolute right-0 top-0 h-[min(28rem,70vw)] w-[min(28rem,70vw)] rounded-full bg-indigo-500/5 blur-[120px]" />
        
        <main id="main-content" className="mx-auto w-full max-w-7xl flex-1 overflow-y-auto px-4 pb-6 pt-20 sm:px-6 md:px-8 md:py-6">
          {children}
        </main>
      </div>
    </div>
  )
}
