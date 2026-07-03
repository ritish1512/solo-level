'use client'

import React, { useState, useTransition } from 'react'
import { useToast } from '@/components/ui/Toast'
import { broadcastNoticeAction, DashboardMetrics } from '@/actions/adminDashboardActions'
import DashboardCharts from '@/components/admin/DashboardCharts'
import {
  Users,
  CheckSquare,
  Activity,
  Shield,
  FileText,
  Mail,
  HardDrive,
  Download,
  AlertTriangle,
  Play,
  Cpu,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  Database,
} from 'lucide-react'

interface AdminDashboardClientProps {
  initialMetrics: DashboardMetrics
}

export default function AdminDashboardClient({ initialMetrics }: AdminDashboardClientProps) {
  const { toast } = useToast()
  const [metrics, setMetrics] = useState<DashboardMetrics>(initialMetrics)
  const [isPending, startTransition] = useTransition()
  
  // Quick notice states
  const [noticeMessage, setNoticeMessage] = useState('')
  const [noticePending, setNoticePending] = useState(false)

  // Active list tabs
  const [activeTab, setActiveTab] = useState<'signups' | 'logins' | 'audit'>('signups')

  // Refresh stats
  const handleRefresh = async () => {
    startTransition(async () => {
      try {
        const res = await fetch('/api/admin/metrics-refresh')
        if (res.ok) {
          const data = await res.json()
          setMetrics(data)
          toast('Metrics refreshed successfully!', 'success')
        } else {
          toast('Failed to refresh metrics', 'error')
        }
      } catch (err) {
        toast('Connection error while refreshing', 'error')
      }
    })
  }

  // Handle system announcement broadcast
  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!noticeMessage.trim()) return

    setNoticePending(true)
    try {
      const result = await broadcastNoticeAction(noticeMessage)
      if (result.success) {
        toast('System notice broadcasted successfully!', 'success')
        setNoticeMessage('')
      } else {
        toast(result.error || 'Failed to broadcast notice', 'error')
      }
    } catch (err) {
      toast('Failed to trigger broadcast action', 'error')
    } finally {
      setNoticePending(false)
    }
  }

  // Download user list client-side CSV
  const handleExportUsers = () => {
    try {
      const csvContent = [
        ['ID', 'Name', 'Email', 'Level', 'XP', 'Streak'],
        ...metrics.topActiveUsers.map((u) => [
          u.id,
          u.name,
          u.email,
          u.level.toString(),
          u.xp.toString(),
          u.streak.toString(),
        ]),
      ]
        .map((row) => row.map((val) => `"${val.replace(/"/g, '""')}"`).join(','))
        .join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.setAttribute('href', url)
      link.setAttribute('download', `solo-leveling-users-${new Date().toISOString().slice(0, 10)}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      toast('User directory exported successfully!', 'success')
    } catch (err) {
      toast('Failed to export CSV', 'error')
    }
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Upper header action bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-3xl">
            Super Admin Console
          </h1>
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            System overview and operations control deck.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={isPending}
            className="flex min-h-10 items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 text-xs font-bold transition-all hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-50 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isPending ? 'animate-spin' : ''}`} />
            Sync Metrics
          </button>

          <button
            onClick={handleExportUsers}
            className="flex min-h-10 items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 text-xs font-bold text-white shadow-md transition-all hover:bg-violet-700 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20"
          >
            <Download className="h-3.5 w-3.5" />
            Export Directory
          </button>
        </div>
      </div>

      {/* Grid: Main Statistics Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Users */}
        <div className="rounded-xl border border-border bg-card/20 p-5 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Total Members</span>
            <div className="rounded-lg bg-violet-500/10 p-2 text-violet-500">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-black text-zinc-800 dark:text-zinc-100">{metrics.totalUsers}</h3>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] font-bold text-zinc-500 dark:text-zinc-400">
              <span className="rounded bg-violet-500/10 px-1.5 py-0.5 text-violet-500">
                +{metrics.newUsersToday} Today
              </span>
              <span>•</span>
              <span>+{metrics.newUsersThisWeek} This Week</span>
            </div>
          </div>
        </div>

        {/* Card 2: Engagement (DAU/WAU) */}
        <div className="rounded-xl border border-border bg-card/20 p-5 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Active Presence</span>
            <div className="flex items-center gap-2">
              {metrics.onlineUsers > 0 && (
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                </span>
              )}
              <span className="text-[10px] font-extrabold text-emerald-500 uppercase tracking-widest">
                {metrics.onlineUsers} Online
              </span>
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-black text-zinc-800 dark:text-zinc-100">
              {metrics.dau} <span className="text-xs font-bold text-zinc-400">DAU</span>
            </h3>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] font-bold text-zinc-500 dark:text-zinc-400">
              <span>{metrics.wau} Weekly (WAU)</span>
              <span>•</span>
              <span>{metrics.mau} Monthly (MAU)</span>
            </div>
          </div>
        </div>

        {/* Card 3: Platform Tasks */}
        <div className="rounded-xl border border-border bg-card/20 p-5 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Task Completion</span>
            <div className="rounded-lg bg-indigo-500/10 p-2 text-indigo-500">
              <CheckSquare className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-black text-zinc-800 dark:text-zinc-100">{metrics.totalTasks}</h3>
            <div className="mt-2 flex items-center justify-between text-[10px] font-bold text-zinc-500">
              <span className="text-indigo-500">{metrics.completedTasks} Done</span>
              <span className="text-zinc-400">{metrics.pendingTasks} Pending</span>
            </div>
            <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
              <div
                className="h-full rounded-full bg-indigo-500 transition-all duration-500"
                style={{
                  width: `${metrics.totalTasks > 0 ? (metrics.completedTasks / metrics.totalTasks) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Card 4: Operations Metrics */}
        <div className="rounded-xl border border-border bg-card/20 p-5 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Asset Storage</span>
            <div className="rounded-lg bg-fuchsia-500/10 p-2 text-fuchsia-500">
              <HardDrive className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-black text-zinc-800 dark:text-zinc-100">
              {metrics.cloudinaryUsageMb} <span className="text-xs font-bold text-zinc-400">MB</span>
            </h3>
            <div className="mt-2 flex items-center justify-between text-[10px] font-bold text-zinc-500">
              <span>{metrics.filesUploaded} Files Uploaded</span>
              <span className="rounded bg-fuchsia-500/10 px-1.5 py-0.5 text-fuchsia-500 uppercase tracking-widest font-extrabold text-[9px]">
                Cloudinary
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Charts Section */}
      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2">
          <DashboardCharts
            title="User Growth (Cumulative)"
            type="area"
            color="violet"
            data={metrics.charts.userGrowth}
          />
        </div>
        <div>
          <DashboardCharts
            title="Active Users Activity Trend"
            type="line"
            color="blue"
            data={metrics.charts.dailyActivity}
          />
        </div>
        <div className="md:col-span-3">
          <DashboardCharts
            title="Task Distribution Status Rates"
            type="bar"
            color="emerald"
            data={metrics.charts.taskCompletion}
          />
        </div>
      </div>

      {/* Grid: Operations Widgets & Console Lists */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Side: Active Directory / Logs Lists */}
        <div className="rounded-xl border border-border bg-card/25 p-6 backdrop-blur-md lg:col-span-2">
          {/* List navigation tabs */}
          <div className="mb-6 flex border-b border-border/40 pb-2">
            {(['signups', 'logins', 'audit'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`mr-4 border-b-2 pb-2 text-xs font-bold transition-all ${
                  activeTab === tab
                    ? 'border-violet-500 text-violet-500'
                    : 'border-transparent text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                {tab === 'signups' && 'Recent Signups'}
                {tab === 'logins' && 'Active Logins'}
                {tab === 'audit' && 'Audit Actions Log'}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto">
            {activeTab === 'signups' && (
              <table className="w-full text-left text-xs font-semibold text-zinc-500">
                <thead>
                  <tr className="border-b border-border/40 pb-2 text-[10px] uppercase text-zinc-400">
                    <th className="py-2">Name</th>
                    <th className="py-2">Email</th>
                    <th className="py-2">Role</th>
                    <th className="py-2">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {metrics.recentSignups.map((u) => (
                    <tr key={u.id} className="hover:bg-zinc-50/10 dark:hover:bg-zinc-800/10">
                      <td className="py-3 font-bold text-zinc-800 dark:text-zinc-200">{u.name}</td>
                      <td className="py-3">{u.email}</td>
                      <td className="py-3">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide ${
                            u.role === 'admin'
                              ? 'bg-rose-500/10 text-rose-500'
                              : 'bg-zinc-500/15 text-zinc-400'
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3" suppressHydrationWarning>{new Date(u.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'logins' && (
              <table className="w-full text-left text-xs font-semibold text-zinc-500">
                <thead>
                  <tr className="border-b border-border/40 pb-2 text-[10px] uppercase text-zinc-400">
                    <th className="py-2">Name</th>
                    <th className="py-2">Email</th>
                    <th className="py-2">Last Active</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {metrics.recentLogins.map((u) => (
                    <tr key={u.id} className="hover:bg-zinc-50/10 dark:hover:bg-zinc-800/10">
                      <td className="py-3 font-bold text-zinc-800 dark:text-zinc-200">{u.name}</td>
                      <td className="py-3">{u.email}</td>
                      <td className="py-3">
                        <span className="flex items-center gap-1.5 text-zinc-400">
                          <Clock className="h-3 w-3" />
                          {u.lastActive ? new Date(u.lastActive).toLocaleTimeString() : 'Unknown'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'audit' && (
              <table className="w-full text-left text-xs font-semibold text-zinc-500">
                <thead>
                  <tr className="border-b border-border/40 pb-2 text-[10px] uppercase text-zinc-400">
                    <th className="py-2">Admin</th>
                    <th className="py-2">Action</th>
                    <th className="py-2">Status</th>
                    <th className="py-2">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {metrics.recentAuditLogs.map((l) => (
                    <tr key={l.id} className="hover:bg-zinc-50/10 dark:hover:bg-zinc-800/10">
                      <td className="py-3 font-bold text-zinc-800 dark:text-zinc-200">{l.adminName}</td>
                      <td className="py-3">
                        <span className="font-mono text-[10px] text-violet-500">{l.action}</span>
                      </td>
                      <td className="py-3">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[9px] font-extrabold uppercase ${
                            l.result === 'Success'
                              ? 'bg-emerald-500/10 text-emerald-500'
                              : 'bg-rose-500/10 text-rose-500'
                          }`}
                        >
                          {l.result}
                        </span>
                      </td>
                      <td className="py-3" suppressHydrationWarning>{new Date(l.timestamp).toLocaleTimeString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right Side: Host Diagnostics & Quick Broadcast */}
        <div className="space-y-6">
          {/* Diagnostics Panel */}
          <div className="rounded-xl border border-border bg-card/25 p-6 backdrop-blur-md">
            <h3 className="mb-4 text-xs font-extrabold uppercase tracking-widest text-zinc-400">
              Host Diagnostics
            </h3>

            <div className="space-y-4 text-xs">
              {/* MDB latency details */}
              <div className="flex items-center justify-between">
                <span className="font-bold text-zinc-500">MongoDB Query Ping</span>
                <span
                  className={`font-mono font-extrabold ${
                    metrics.systemHealth.latencyMs < 50
                      ? 'text-emerald-500'
                      : metrics.systemHealth.latencyMs < 120
                      ? 'text-amber-500'
                      : 'text-rose-500'
                  }`}
                >
                  {metrics.systemHealth.latencyMs} ms
                </span>
              </div>

              {/* Memory Progress Stats */}
              <div className="space-y-1">
                <div className="flex justify-between text-zinc-500">
                  <span className="font-bold">System Memory (Server)</span>
                  <span className="font-bold">{metrics.systemHealth.memoryUsagePercent}%</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-zinc-200 dark:bg-zinc-800">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      metrics.systemHealth.memoryUsagePercent < 70
                        ? 'bg-emerald-500'
                        : metrics.systemHealth.memoryUsagePercent < 90
                        ? 'bg-amber-500'
                        : 'bg-rose-500'
                    }`}
                    style={{ width: `${metrics.systemHealth.memoryUsagePercent}%` }}
                  />
                </div>
              </div>

              {/* Env Variables Integrity Check */}
              <div className="border-t border-border/40 pt-3">
                <p className="mb-2 font-bold text-zinc-400 text-[10px] uppercase">
                  Service Config Checks
                </p>
                <div className="grid grid-cols-2 gap-2 text-[11px] font-bold">
                  <div className="flex items-center gap-1.5">
                    {metrics.systemHealth.envCheck.mongodb ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 text-rose-500" />
                    )}
                    <span className="text-zinc-600 dark:text-zinc-400">Database Connection</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {metrics.systemHealth.envCheck.cloudinary ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 text-rose-500" />
                    )}
                    <span className="text-zinc-600 dark:text-zinc-400">Cloudinary API</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {metrics.systemHealth.envCheck.nodemailer ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 text-rose-500" />
                    )}
                    <span className="text-zinc-600 dark:text-zinc-400">Nodemailer SMTP</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {metrics.systemHealth.envCheck.nextauth ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 text-rose-500" />
                    )}
                    <span className="text-zinc-600 dark:text-zinc-400">JWT Secret Token</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* System Announcement Console */}
          <div className="rounded-xl border border-border bg-card/25 p-6 backdrop-blur-md">
            <h3 className="mb-4 text-xs font-extrabold uppercase tracking-widest text-zinc-400">
              Broadcast System Notice
            </h3>

            <form onSubmit={handleBroadcast} className="space-y-3">
              <div>
                <textarea
                  value={noticeMessage}
                  onChange={(e) => setNoticeMessage(e.target.value)}
                  placeholder="Enter dynamic notice or alert message to display to online platform users..."
                  rows={3}
                  className="w-full rounded-lg border border-border bg-zinc-50/50 p-2.5 text-xs font-semibold text-zinc-700 outline-none transition-all placeholder:text-zinc-400 focus:border-violet-500 dark:bg-zinc-950/20 dark:text-zinc-300"
                />
              </div>

              <button
                type="submit"
                disabled={noticePending || !noticeMessage.trim()}
                className="flex w-full min-h-10 items-center justify-center gap-2 rounded-lg bg-violet-600 text-xs font-bold text-white shadow transition-all hover:bg-violet-700 disabled:opacity-50"
              >
                {noticePending ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Play className="h-3.5 w-3.5" />
                )}
                Broadcast System Notice
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
