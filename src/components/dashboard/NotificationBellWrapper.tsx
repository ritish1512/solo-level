'use client'

import dynamic from 'next/dynamic'

const NotificationBell = dynamic(() => import('./NotificationBell'), {
  ssr: false,
  loading: () => <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
})

export default function NotificationBellWrapper() {
  return <NotificationBell />
}
