'use client'

import React, { useEffect, useState } from 'react'
import { Bell, CheckCircle2, Clock, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { useToast } from '@/components/ui/Toast'
import {
  getUserNotificationsAction,
  markNotificationReadAction,
  UserNotification,
} from '@/actions/notificationActions'

export default function NotificationsPage() {
  const { toast } = useToast()
  const [notifications, setNotifications] = useState<UserNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [marking, setMarking] = useState<string | null>(null)

  useEffect(() => {
    async function loadNotifications() {
      try {
        const data = await getUserNotificationsAction()
        setNotifications(data)
      } catch (error) {
        console.error('Failed to load notifications', error)
        toast('Unable to load notifications right now.', 'error')
      } finally {
        setLoading(false)
      }
    }

    loadNotifications()
  }, [])

  const handleMarkRead = async (id: string) => {
    setMarking(id)
    const res = await markNotificationReadAction(id)
    setMarking(null)

    if (res.success) {
      setNotifications((prev) => prev.map((notification) => notification.id === id ? { ...notification, isRead: true } : notification))
      toast('Notification marked read.', 'success')
    } else {
      toast(res.error || 'Unable to update notification.', 'error')
    }
  }

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center text-zinc-400">
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          <Clock className="h-5 w-5 text-indigo-500" />
          Loading notifications...
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-white">Notifications</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Your in-app alerts, reminders, and system updates.</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-4 py-2 text-sm text-zinc-700 dark:bg-zinc-950/70 dark:text-zinc-200">
          <Bell className="h-4 w-4 text-indigo-500" />
          {notifications.filter((n) => !n.isRead).length} unread
        </div>
      </div>

      {notifications.length === 0 ? (
        <Card className="border-border bg-card/30">
          <CardContent className="p-8 text-center text-sm text-zinc-500">No notifications have arrived yet.</CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {notifications.map((notification) => (
            <Card key={notification.id} className={`border ${notification.isRead ? 'border-border/60 bg-background' : 'border-indigo-300/70 bg-indigo-50/30 dark:bg-indigo-950/20'} p-0`}>
              <CardHeader className="items-center justify-between gap-4 border-b border-border/30 px-4 py-4">
                <div>
                  <CardTitle className="text-sm font-semibold text-zinc-950 dark:text-white">{notification.title}</CardTitle>
                  <CardDescription className="text-xs text-zinc-500 dark:text-zinc-400">{new Date(notification.scheduledFor).toLocaleString()}</CardDescription>
                </div>
                <span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${notification.type === 'alert' ? 'bg-rose-500/10 text-rose-600' : notification.type === 'warning' ? 'bg-amber-500/10 text-amber-600' : notification.type === 'system' ? 'bg-slate-500/10 text-slate-600' : 'bg-indigo-500/10 text-indigo-600'}`}>
                  {notification.type}
                </span>
              </CardHeader>
              <CardContent className="space-y-4 px-4 py-4">
                <p className="text-sm leading-6 text-zinc-700 dark:text-zinc-200">{notification.message}</p>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-zinc-400">
                    {notification.isRead ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-amber-500" />}
                    {notification.isRead ? 'Read' : 'Unread'}
                  </div>
                  {!notification.isRead && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleMarkRead(notification.id)}
                      isLoading={marking === notification.id}
                    >
                      Mark read
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
