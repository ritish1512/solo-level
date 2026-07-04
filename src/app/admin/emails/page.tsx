'use client'

import React, { useEffect, useState, useTransition } from 'react'
import { useToast } from '@/components/ui/Toast'
import {
  fetchAdminEmailLogs,
  resendFailedEmailAction,
  sendAnnouncementEmailAction,
  EmailLog,
} from '@/actions/adminEmailActions'
import {
  Mail,
  Send,
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  FileText,
  AlertCircle,
  Loader2,
} from 'lucide-react'

export default function AdminEmailsPage() {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<'logs' | 'broadcast' | 'templates'>('logs')
  const [loading, setLoading] = useState(true)
  const [isPending, startTransition] = useTransition()

  // Logs state
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'sent' | 'failed'>('all')
  const [page, setPage] = useState(1)
  const [logsData, setLogsData] = useState<{ logs: EmailLog[]; total: number; pages: number } | null>(null)

  // Broadcast state
  const [broadcast, setBroadcast] = useState({ subject: '', body: '', group: 'users' as 'all' | 'admins' | 'users' })

  // Selected template preview
  const [previewTemplate, setPreviewTemplate] = useState<{ name: string; html: string } | null>(null)

  // Templates definitions
  const emailTemplates = [
    {
      name: 'Email Verification',
      subject: 'Verify Your Email - Solo Leveling Dashboard',
      description: 'Dispatched on user registration to verify email authenticity.',
      html: `
        <div style="font-family: sans-serif; max-width: 500px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
          <h2 style="color: #4f46e5; text-align: center;">Welcome to Solo Leveling!</h2>
          <p>Please click the button below to verify your email address and unlock your dashboard console:</p>
          <div style="text-align: center; margin: 25px 0;">
            <a href="#" style="background-color: #4f46e5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">Verify Email Address</a>
          </div>
        </div>
      `,
    },
    {
      name: 'Password Reset Request',
      subject: 'Reset Your Password - Solo Leveling Dashboard',
      description: 'Triggered when a user requests password restoration.',
      html: `
        <div style="font-family: sans-serif; max-width: 500px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
          <h2 style="color: #dc2626; text-align: center;">Reset Your Password</h2>
          <p>We received a request to change your password. Click the button below to choose a new password:</p>
          <div style="text-align: center; margin: 25px 0;">
            <a href="#" style="background-color: #dc2626; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">Reset Password</a>
          </div>
          <p style="font-size: 11px; color: #777;">This link expires in 1 hour.</p>
        </div>
      `,
    },
    {
      name: 'Task Deadline Reminder',
      subject: '⏰ Task Reminder: [Task Name]',
      description: 'Time-triggered reminder sent before task deadlines.',
      html: `
        <div style="font-family: sans-serif; max-width: 500px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
          <h2 style="color: #f59e0b; text-align: center;">⏰ Task Deadline Reminder</h2>
          <p>This is a friendly reminder that you have an upcoming task deadline:</p>
          <div style="background-color: #fffbeb; padding: 15px; border-left: 4px solid #f59e0b; border-radius: 4px; margin: 15px 0;">
            <strong style="font-size: 15px;">Task Title: Complete UI layout</strong>
            <p style="margin: 5px 0 0 0; color: #92400e;">📅 Due: Jul 03, 2026, 05:00 PM</p>
          </div>
        </div>
      `,
    },
    {
      name: 'Daily Habit Check-in',
      subject: '📋 Daily Habit Check-In',
      description: 'Daily check-in email to prompt streak maintenance.',
      html: `
        <div style="font-family: sans-serif; max-width: 500px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
          <h2 style="color: #06b6d4; text-align: center;">📋 Daily Habit Check-In</h2>
          <p>Keep your daily streaks alive! 🔥 Complete these habits today:</p>
          <ul style="color: #164e63; font-weight: bold;">
            <li>Morning Cardio</li>
            <li>LeetCode Daily Challenge</li>
            <li>Read 10 Pages</li>
          </ul>
        </div>
      `,
    },
  ]

  // Query logs
  const loadLogs = async () => {
    setLoading(true)
    try {
      const result = await fetchAdminEmailLogs({
        search,
        status: statusFilter,
        page,
        limit: 10,
      })
      setLogsData(result)
    } catch (err) {
      toast('Failed to load email queue logs', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const id = setTimeout(() => {
      if (activeTab === 'logs') {
        loadLogs()
      } else {
        setLoading(false)
      }
    }, 0)
    return () => clearTimeout(id)
  }, [activeTab, search, statusFilter, page])

  // Trigger manual resend
  const handleResend = async (logId: string) => {
    toast('Attempting to resend email...', 'info')
    try {
      const res = await resendFailedEmailAction(logId)
      if (res.success) {
        toast('Email re-sent successfully!', 'success')
        loadLogs()
      } else {
        toast(res.error || 'Failed to dispatch email', 'error')
      }
    } catch (err) {
      toast('Error triggering email dispatch', 'error')
    }
  }

  // Handle broadcast announcement submission
  const handleBroadcastAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!broadcast.subject.trim() || !broadcast.body.trim()) return

    startTransition(async () => {
      try {
        const res = await sendAnnouncementEmailAction({
          subject: broadcast.subject,
          htmlBody: broadcast.body,
          recipientGroup: broadcast.group,
        })
        if (res.success) {
          toast(`Announcement sent successfully to ${res.count} members!`, 'success')
          setBroadcast({ subject: '', body: '', group: 'users' })
        } else {
          toast(res.error || 'Failed to dispatch emails', 'error')
        }
      } catch (err) {
        toast('Broadcast dispatch error', 'error')
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div>
        <h1 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-3xl">
          Email Center
        </h1>
        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
          Track email logs, view HTML templates, and broadcast platform updates to user cohorts.
        </p>
      </div>

      {/* Tabs navigation panel */}
      <div className="flex border-b border-border/40 pb-2">
        <button
          onClick={() => setActiveTab('logs')}
          className={`mr-6 flex items-center gap-1.5 border-b-2 pb-2 text-xs font-bold transition-all ${
            activeTab === 'logs'
              ? 'border-violet-500 text-violet-500'
              : 'border-transparent text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
          }`}
        >
          <Clock className="h-4 w-4" />
          Email Queue Logs
        </button>

        <button
          onClick={() => setActiveTab('broadcast')}
          className={`mr-6 flex items-center gap-1.5 border-b-2 pb-2 text-xs font-bold transition-all ${
            activeTab === 'broadcast'
              ? 'border-violet-500 text-violet-500'
              : 'border-transparent text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
          }`}
        >
          <Send className="h-4 w-4" />
          Cohort Announcement
        </button>

        <button
          onClick={() => setActiveTab('templates')}
          className={`flex items-center gap-1.5 border-b-2 pb-2 text-xs font-bold transition-all ${
            activeTab === 'templates'
              ? 'border-violet-500 text-violet-500'
              : 'border-transparent text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
          }`}
        >
          <FileText className="h-4 w-4" />
          Email Templates
        </button>
      </div>

      {/* Tab Panel: Logs */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          {/* Query Filter Options bar */}
          <div className="flex flex-col gap-3 rounded-xl border border-border bg-card/20 p-4 backdrop-blur-md sm:flex-row sm:items-center">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                placeholder="Search email subject or recipients..."
                className="w-full rounded-lg border border-border bg-zinc-50/50 py-2.5 pl-10 pr-4 text-xs font-semibold text-zinc-700 outline-none placeholder:text-zinc-400 focus:border-violet-500 dark:bg-zinc-950/20 dark:text-zinc-300"
              />
            </div>

            {/* Status Select */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                  setStatusFilter(e.target.value as 'all' | 'sent' | 'failed')
                  setPage(1)
                }}
                className="w-full rounded-lg border border-border bg-zinc-50/50 py-2.5 pl-4 pr-10 text-xs font-bold text-zinc-600 outline-none dark:bg-zinc-950/20 dark:text-zinc-400"
              >
                <option value="all">All Dispatches</option>
                <option value="sent">Sent</option>
                <option value="failed">Failed / Delayed</option>
              </select>
            </div>
          </div>

          {/* Logs Table */}
          <div className="rounded-xl border border-border bg-card/25 backdrop-blur-md">
            {loading ? (
              <div className="flex h-64 items-center justify-center text-zinc-400" aria-label="Loading logs">
                <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
              </div>
            ) : logsData && logsData.logs.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-semibold text-zinc-500">
                  <thead>
                    <tr className="border-b border-border/40 text-[10px] uppercase text-zinc-400">
                      <th className="py-4 px-6">Recipient</th>
                      <th className="py-4 px-6">Subject / Notification</th>
                      <th className="py-4 px-6 text-center">Status</th>
                      <th className="py-4 px-6">Triggered Time</th>
                      <th className="py-4 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20">
                    {logsData.logs.map((log) => (
                      <tr key={log.id} className="hover:bg-zinc-50/10 dark:hover:bg-zinc-800/10">
                        <td className="py-4 px-6">
                          <p className="font-bold text-zinc-800 dark:text-zinc-200">{log.userName}</p>
                          <p className="text-[10px] font-semibold text-zinc-400">{log.userEmail}</p>
                        </td>
                        <td className="py-4 px-6 text-zinc-700 dark:text-zinc-300 font-bold">
                          {log.subject}
                        </td>
                        <td className="py-4 px-6 text-center">
                          <span
                            className={`rounded px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider flex items-center justify-center gap-1 w-20 mx-auto ${
                              log.isSent
                                ? 'bg-emerald-500/10 text-emerald-500'
                                : 'bg-rose-500/10 text-rose-500'
                            }`}
                          >
                            {log.isSent ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                            {log.isSent ? 'Sent' : 'Failed'}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-zinc-400">
                          {new Date(log.triggerTime).toLocaleString()}
                        </td>
                        <td className="py-4 px-6 text-right">
                          {!log.isSent && (
                            <button
                              onClick={() => handleResend(log.id)}
                              className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-bold text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800 flex items-center gap-1.5 ml-auto"
                            >
                              <RefreshCw className="h-3 w-3 text-violet-500" />
                              Resend
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex h-64 flex-col items-center justify-center text-zinc-400 gap-2">
                <AlertCircle className="h-8 w-8 text-zinc-500" />
                <p className="text-xs font-bold">No matching email notifications found.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab Panel: Broadcast */}
      {activeTab === 'broadcast' && (
        <div className="rounded-xl border border-border bg-card/25 p-6 backdrop-blur-md max-w-xl">
          <form onSubmit={handleBroadcastAnnouncement} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-zinc-500">Recipient Cohort</label>
                <select
                  value={broadcast.group}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setBroadcast({ ...broadcast, group: e.target.value as 'all' | 'admins' | 'users' })}
                  className="w-full rounded-lg border border-border bg-zinc-50/50 p-2.5 text-xs font-bold text-zinc-600 outline-none dark:bg-zinc-950/20 dark:text-zinc-400"
                >
                  <option value="users">Active Users Only</option>
                  <option value="admins">Administrators Only</option>
                  <option value="all">All Platform Accounts</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-zinc-500">Email Subject Line</label>
              <input
                type="text"
                value={broadcast.subject}
                onChange={(e) => setBroadcast({ ...broadcast, subject: e.target.value })}
                placeholder="Platform update: New leveling metrics released!"
                className="w-full rounded-lg border border-border bg-zinc-50/50 p-2.5 text-xs font-semibold text-zinc-700 outline-none focus:border-violet-500 dark:bg-zinc-950/20 dark:text-zinc-300"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-zinc-500">HTML Mail Body Content</label>
              <textarea
                value={broadcast.body}
                onChange={(e) => setBroadcast({ ...broadcast, body: e.target.value })}
                placeholder="Provide notice details... HTML markup elements are allowed."
                rows={6}
                className="w-full rounded-lg border border-border bg-zinc-50/50 p-2.5 text-xs font-semibold text-zinc-700 outline-none focus:border-violet-500 dark:bg-zinc-950/20 dark:text-zinc-300"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isPending || !broadcast.subject || !broadcast.body}
              className="flex min-h-10 items-center justify-center gap-2 rounded-lg bg-violet-600 px-5 text-xs font-bold text-white shadow hover:bg-violet-700 disabled:opacity-50"
            >
              {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Send Announcement Email Broadcast
            </button>
          </form>
        </div>
      )}

      {/* Tab Panel: Templates */}
      {activeTab === 'templates' && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Templates list card */}
          <div className="space-y-4">
            {emailTemplates.map((t, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-border bg-card/25 p-5 backdrop-blur-md flex justify-between items-center hover:shadow transition-all"
              >
                <div>
                  <h3 className="text-xs font-extrabold text-zinc-800 dark:text-zinc-200">{t.name}</h3>
                  <p className="text-[10px] text-zinc-400 mt-1 font-semibold">{t.description}</p>
                </div>
                <button
                  onClick={() => setPreviewTemplate({ name: t.name, html: t.html })}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                  title="View Template HTML Layout"
                >
                  <Eye className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Template preview board */}
          <div className="rounded-xl border border-border bg-card/25 p-5 backdrop-blur-md flex flex-col min-h-[300px]">
            {previewTemplate ? (
              <div className="flex-1 flex flex-col space-y-3">
                <h4 className="text-xs font-extrabold uppercase tracking-widest text-zinc-400">
                  Preview: {previewTemplate.name}
                </h4>
                <div
                  className="flex-1 border border-border/40 rounded-lg p-4 bg-white text-black overflow-y-auto text-xs"
                  dangerouslySetInnerHTML={{ __html: previewTemplate.html }}
                />
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-zinc-400 text-xs font-bold gap-1.5">
                <Mail className="h-8 w-8 text-zinc-500" />
                Select an email template to view HTML layout.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
