'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'

interface TimeNotification {
  id: string
  type: 'task' | 'timeblock'
  title: string
  time: string
  message: string
}

export function useTimeSensitiveNotifications() {
  const { data: session } = useSession()
  const [notifications, setNotifications] = useState<TimeNotification[]>([])
  const [lastCheck, setLastCheck] = useState<Date | null>(null)

  useEffect(() => {
    if (!session?.user) return

    // Check for time-sensitive notifications every minute
    const interval = setInterval(async () => {
      try {
        const response = await fetch('/api/notifications/time-sensitive', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        if (response.ok) {
          const data = await response.json()
          setNotifications(data.notifications || [])
          setLastCheck(new Date())
        }
      } catch (error) {
        console.error('Failed to fetch time-sensitive notifications:', error)
      }
    }, 60000) // Check every minute

    // Initial check
    const initialCheck = async () => {
      try {
        const response = await fetch('/api/notifications/time-sensitive')
        if (response.ok) {
          const data = await response.json()
          setNotifications(data.notifications || [])
          setLastCheck(new Date())
        }
      } catch (error) {
        console.error('Failed to fetch initial notifications:', error)
      }
    }

    initialCheck()

    return () => clearInterval(interval)
  }, [session])

  return { notifications, lastCheck }
}
