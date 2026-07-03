import React from 'react'
import type { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import AdminSidebar from '@/components/admin/Sidebar'

export const metadata: Metadata = {
  title: 'Super Admin Console',
  description: 'Control center for the Solo Leveling SaaS platform.',
  robots: {
    index: false,
    follow: false,
  },
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  // Server-side redirect safety (backup to the route middleware)
  if (!session) {
    redirect('/login?error=Please%20log%20in%20to%2520access%20the%20admin%20panel.')
  }

  if (session.user.role !== 'admin') {
    redirect('/login?error=forbidden')
  }

  return (
    <div className="flex min-h-dvh overflow-x-hidden bg-background text-foreground">
      {/* Super Admin Navigation Sidebar */}
      <AdminSidebar />

      {/* Main Admin Workspace Panel */}
      <div className="relative flex min-w-0 flex-1 flex-col md:h-screen md:overflow-hidden">
        {/* Glow styling to reflect the Solo Leveling premium dark/neon aesthetic */}
        <div className="pointer-events-none absolute right-0 top-0 h-[min(28rem,70vw)] w-[min(28rem,70vw)] rounded-full bg-violet-500/5 blur-[120px]" />
        <div className="pointer-events-none absolute left-0 bottom-0 h-[min(20rem,50vw)] w-[min(20rem,50vw)] rounded-full bg-fuchsia-500/5 blur-[100px]" />
        
        <main
          id="admin-main-content"
          className="mx-auto w-full max-w-7xl flex-1 overflow-y-auto px-4 pb-6 pt-20 sm:px-6 md:px-8 md:py-6"
        >
          {children}
        </main>
      </div>
    </div>
  )
}
