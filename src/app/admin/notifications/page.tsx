'use client'

import React, { useEffect, useState, useTransition } from 'react'
import { useToast } from '@/components/ui/Toast'
import {
  fetchAdminNotifications,
  createNotificationAction,
  deleteNotificationAction,
  NotificationLog,
} from '@/actions/adminNotificationActions'
import {
  Bell,
  Send,
  Plus,
  Trash2,
  AlertTriangle,
  Loader2,
  Calendar,
  User,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
} from 'lucide-react'

export default function AdminNotificationsPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [isPending, startTransition] = useTransition()

  // Form states
  const [form, setForm] = useState({
    title: '',
    message: '',
    type: 'info' as 'info' | 'warning' | 'alert' | 'system',
    recipientGroup: 'all',
    customUserId: '',
    isScheduled: false,
    scheduledFor: '',
  })

  // History state
  const [notifications, setNotifications] = useState<NotificationLog[]>([])

  // Load history
  const loadHistory = async () => {
    try {
      const logs = await fetchAdminNotifications()
      setNotifications(logs)
    } catch (err) {
      toast('Failed to query notification history logs', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const id = setTimeout(() => loadHistory(), 0)
    return () => clearTimeout(id)
  }, [])

  // Create notification
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim() || !form.message.trim()) return

    const targetGroup = form.recipientGroup === 'custom' ? form.customUserId.trim() : form.recipientGroup
    if (!targetGroup) {
      toast('Please enter a target User ID', 'error')
      return
    }

    startTransition(async () => {
      try {
        const res = await createNotificationAction({
          title: form.title,
          message: form.message,
          type: form.type,
          recipientGroup: targetGroup,
          scheduledFor: form.isScheduled ? form.scheduledFor : undefined,
        })
        if (res.success) {
          toast(`Notification dispatched successfully to ${res.count} members!`, 'success')
          setForm({
            title: '',
            message: '',
            type: 'info',
            recipientGroup: 'all',
            customUserId: '',
            isScheduled: false,
            scheduledFor: '',
          })
          loadHistory()
        } else {
          toast(res.error || 'Failed to dispatch notification', 'error')
        }
      } catch (err) {
        toast('Failed to complete notification creation', 'error')
      }
    })
  }

  // Delete notification
  const handleDelete = async (id: string) => {
    startTransition(async () => {
      try {
        const res = await deleteNotificationAction(id)
        if (res.success) {
          toast('Notification deleted successfully!', 'success')
          loadHistory()
        } else {
          toast(res.error || 'Failed to delete notification', 'error')
        }
      } catch (err) {
        toast('Connection error during deletion', 'error')
      }
    })
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-zinc-400" aria-label="Loading notification panel">
        <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
      </div>
    )
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Left side: Dispatch panel */}
      <div className="rounded-xl border border-border bg-card/25 p-6 backdrop-blur-md">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="h-5 w-5 text-violet-500" />
          <h2 className="text-sm font-black uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
            Create Notification
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-zinc-500">Alert Title</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Server Maintenance Scheduled"
              className="w-full rounded-lg border border-border bg-zinc-50/50 p-2.5 text-xs font-semibold text-zinc-700 outline-none focus:border-violet-500 dark:bg-zinc-950/20 dark:text-zinc-300"
              required
            />
          </div>

          {/* Message */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-zinc-500">Notice Body Description</label>
            <textarea
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder="Provide notification description..."
              rows={4}
              className="w-full rounded-lg border border-border bg-zinc-50/50 p-2.5 text-xs font-semibold text-zinc-700 outline-none focus:border-violet-500 dark:bg-zinc-950/20 dark:text-zinc-300"
              required
            />
          </div>

          {/* Grid: Type & Group */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-zinc-500">Alert Severity</label>
              <select
                value={form.type}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm({ ...form, type: e.target.value as 'info' | 'warning' | 'alert' | 'system' })}
                className="w-full rounded-lg border border-border bg-zinc-50/50 p-2.5 text-xs font-bold text-zinc-600 outline-none dark:bg-zinc-950/20 dark:text-zinc-400"
              >
                <option value="info">Info</option>
                <option value="system">System</option>
                <option value="warning">Warning</option>
                <option value="alert">Alert</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-zinc-500">Recipient Cohort</label>
              <select
                value={form.recipientGroup}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm({ ...form, recipientGroup: e.target.value })}
                className="w-full rounded-lg border border-border bg-zinc-50/50 p-2.5 text-xs font-bold text-zinc-600 outline-none dark:bg-zinc-950/20 dark:text-zinc-400"
              >
                <option value="all">All Users</option>
                <option value="users">Standard Users</option>
                <option value="admins">Administrators</option>
                <option value="custom">Individual User ID</option>
              </select>
            </div>
          </div>

          {/* Custom user ID field */}
          {form.recipientGroup === 'custom' && (
            <div className="space-y-1 animate-fade-in">
              <label className="block text-xs font-bold text-zinc-500">Recipient User ID</label>
              <input
                type="text"
                value={form.customUserId}
                onChange={(e) => setForm({ ...form, customUserId: e.target.value })}
                placeholder="Paste User ID here (e.g. 64b8f...)"
                className="w-full rounded-lg border border-border bg-zinc-50/50 p-2.5 text-xs font-semibold text-zinc-700 outline-none focus:border-violet-500 dark:bg-zinc-950/20 dark:text-zinc-300"
                required
              />
            </div>
          )}

          {/* Scheduler trigger */}
          <div className="border-t border-border/40 pt-3 space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is-scheduled"
                checked={form.isScheduled}
                onChange={(e) => setForm({ ...form, isScheduled: e.target.checked })}
                className="h-3.5 w-3.5 rounded border-zinc-300 text-violet-600 focus:ring-violet-500"
              />
              <label htmlFor="is-scheduled" className="text-xs font-bold text-zinc-500 cursor-pointer select-none">
                Schedule for future dispatch
              </label>
            </div>

            {form.isScheduled && (
              <div className="space-y-1 animate-fade-in">
                <label className="block text-xs font-bold text-zinc-500">Date & Time</label>
                <input
                  type="datetime-local"
                  value={form.scheduledFor}
                  onChange={(e) => setForm({ ...form, scheduledFor: e.target.value })}
                  className="w-full rounded-lg border border-border bg-zinc-50/50 p-2.5 text-xs font-semibold text-zinc-700 outline-none focus:border-violet-500 dark:bg-zinc-950/20 dark:text-zinc-300"
                  required
                />
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isPending || !form.title || !form.message}
            className="flex w-full min-h-10 items-center justify-center gap-2 rounded-lg bg-violet-600 text-xs font-bold text-white shadow hover:bg-violet-700 disabled:opacity-50"
          >
            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            {form.isScheduled ? 'Schedule Alert Notice' : 'Dispatch Alert Notice'}
          </button>
        </form>
      </div>

      {/* Right side: History logs list */}
      <div className="rounded-xl border border-border bg-card/25 p-6 backdrop-blur-md lg:col-span-2 space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-violet-500" />
          <h2 className="text-sm font-black uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
            Dispatched Alert History
          </h2>
        </div>

        <div className="overflow-y-auto max-h-[75vh] space-y-3">
          {notifications.length > 0 ? (
            notifications.map((n) => (
              <div
                key={n.id}
                className="rounded-xl border border-border bg-card/20 p-4 backdrop-blur-md flex gap-4 items-start"
              >
                <span
                  className={`rounded px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide shrink-0 ${
                    n.type === 'warning'
                      ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                      : n.type === 'alert'
                      ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                      : n.type === 'system'
                      ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                      : 'bg-zinc-500/10 text-zinc-400 border border-border/30'
                  }`}
                >
                  {n.type}
                </span>

                <div className="flex-1 min-w-0 space-y-1">
                  <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate">{n.title}</p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">{n.message}</p>
                  <div className="flex flex-wrap items-center gap-2 pt-1 text-[9px] font-bold text-zinc-400">
                    <span className="flex items-center gap-1">
                      <User className="h-3.5 w-3.5" />
                      Recipient: {n.recipientName} ({n.recipientEmail})
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      Scheduled: {new Date(n.scheduledFor).toLocaleString()}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleDelete(n.id)}
                  disabled={isPending}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-transparent text-rose-500 hover:bg-rose-500/10 shrink-0 disabled:opacity-50"
                  title="Remove Notification"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          ) : (
            <div className="flex h-48 flex-col items-center justify-center text-zinc-400 gap-2">
              <AlertTriangle className="h-8 w-8 text-zinc-500" />
              <p className="text-xs font-bold">No dispatched alert notifications logged.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
