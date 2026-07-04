'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { Bell } from 'lucide-react'
import { getUserNotificationsAction } from '@/actions/notificationActions'

interface NotificationBellProps {
  className?: string
}

export default function NotificationBell({ className }: NotificationBellProps) {
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    async function fetchCount() {
      try {
        const notifications = await getUserNotificationsAction()
        const unread = notifications.filter((n) => !n.isRead).length
        setUnreadCount(unread)
      } catch (err) {
        console.error('Failed to fetch unread notifications count', err)
      }
    }

    fetchCount()
    
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchCount, 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <Link
      href="/dashboard/notifications"
      className={`relative inline-flex items-center justify-center rounded-full border border-border/80 bg-white/90 p-2 text-zinc-700 shadow-sm transition-all hover:bg-zinc-50 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900 ${className}`}
      aria-label="Notifications"
    >
      <Bell className="h-4.5 w-4.5 text-indigo-500 hover:rotate-12 transition-transform duration-200" />
      {unreadCount > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-rose-500 text-[9px] font-extrabold text-white ring-2 ring-background dark:ring-zinc-950 animate-pulse">
          {unreadCount}
        </span>
      )}
    </Link>
  )
}
