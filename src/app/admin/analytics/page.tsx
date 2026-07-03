'use client'

import React, { useEffect, useState } from 'react'
import { fetchPlatformAnalytics, PlatformAnalytics } from '@/actions/adminAnalyticsActions'
import DashboardCharts from '@/components/admin/DashboardCharts'
import {
  BarChart3,
  TrendingUp,
  Download,
  AlertTriangle,
  Loader2,
  Clock,
  Laptop,
  Chrome,
  Flame,
  Award,
} from 'lucide-react'
import { useToast } from '@/components/ui/Toast'

export default function AdminAnalyticsPage() {
  const { toast } = useToast()
  const [data, setData] = useState<PlatformAnalytics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadAnalytics() {
      try {
        const stats = await fetchPlatformAnalytics()
        setData(stats)
      } catch (err) {
        console.error('Failed to load platform analytics', err)
        toast('Failed to load system reports', 'error')
      } finally {
        setLoading(false)
      }
    }
    loadAnalytics()
  }, [])

  // Export platform activity CSV client-side
  const handleExportSystemActivity = () => {
    if (!data) return
    try {
      const csvContent = [
        ['Date', 'Total Users Registered'],
        ...data.growth30Days.map((d) => [d.label, d.value.toString()]),
      ]
        .map((row) => row.map((val) => `"${val.replace(/"/g, '""')}"`).join(','))
        .join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.setAttribute('href', url)
      link.setAttribute('download', `system-growth-report-${new Date().toISOString().slice(0, 10)}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      toast('System growth report exported!', 'success')
    } catch (err) {
      toast('Export failed', 'error')
    }
  }

  // Export tasks categoric distribution CSV
  const handleExportTasksReport = () => {
    if (!data) return
    try {
      const csvContent = [
        ['Category', 'Total Tasks Logged'],
        ...data.taskCategoryDistribution.map((c) => [c.label, c.value.toString()]),
      ]
        .map((row) => row.map((val) => `"${val.replace(/"/g, '""')}"`).join(','))
        .join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.setAttribute('href', url)
      link.setAttribute('download', `tasks-distribution-report-${new Date().toISOString().slice(0, 10)}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      toast('Tasks distribution report exported!', 'success')
    } catch (err) {
      toast('Export failed', 'error')
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-zinc-400" aria-label="Loading analytics">
        <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex h-64 flex-col items-center justify-center text-zinc-400 gap-2">
        <AlertTriangle className="h-8 w-8 text-rose-500" />
        <p className="text-xs font-bold">Failed to load platform diagnostics metrics.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header action bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-3xl">
            System Analytics
          </h1>
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Platform performance metrics, growth rates, and features engagement report.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportSystemActivity}
            className="flex min-h-10 items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 text-xs font-bold transition-all hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          >
            <Download className="h-3.5 w-3.5" />
            Export Growth CSV
          </button>

          <button
            onClick={handleExportTasksReport}
            className="flex min-h-10 items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 text-xs font-bold text-white shadow transition-all hover:bg-violet-700 hover:shadow-md"
          >
            <Download className="h-3.5 w-3.5" />
            Export Tasks CSV
          </button>
        </div>
      </div>

      {/* Totals overview panel */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card/20 p-4 backdrop-blur-md">
          <p className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider">Registered Accounts</p>
          <h3 className="mt-2 text-xl font-black text-zinc-800 dark:text-zinc-100">{data.totals.users}</h3>
        </div>
        <div className="rounded-xl border border-border bg-card/20 p-4 backdrop-blur-md">
          <p className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider">Total Tasks Logged</p>
          <h3 className="mt-2 text-xl font-black text-zinc-800 dark:text-zinc-100">{data.totals.tasks}</h3>
        </div>
        <div className="rounded-xl border border-border bg-card/20 p-4 backdrop-blur-md">
          <p className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider">Active Projects</p>
          <h3 className="mt-2 text-xl font-black text-zinc-800 dark:text-zinc-100">{data.totals.projects}</h3>
        </div>
        <div className="rounded-xl border border-border bg-card/20 p-4 backdrop-blur-md">
          <p className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider">Habits Tracked</p>
          <h3 className="mt-2 text-xl font-black text-zinc-800 dark:text-zinc-100">{data.totals.habits}</h3>
        </div>
      </div>

      {/* Main trends section */}
      <div className="grid gap-6 md:grid-cols-2">
        <DashboardCharts
          title="User Growth (Past 30 Days)"
          type="area"
          color="violet"
          data={data.growth30Days}
        />
        <DashboardCharts
          title="Active Presence Trends (Past 30 Days)"
          type="line"
          color="blue"
          data={data.activeTrends30Days}
        />
      </div>

      {/* Categoric distributions sections */}
      <div className="grid gap-6 md:grid-cols-2">
        <DashboardCharts
          title="Task Distribution by Category"
          type="bar"
          color="emerald"
          data={data.taskCategoryDistribution}
        />
        <DashboardCharts
          title="User Habit Streak Milestones"
          type="bar"
          color="amber"
          data={data.habitStreakBuckets}
        />
      </div>

      {/* Client Platforms & Tech Stack distribution */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Device breakdown */}
        <div className="rounded-xl border border-border bg-card/25 p-5 backdrop-blur-md">
          <div className="flex items-center gap-2 mb-4">
            <Laptop className="h-4.5 w-4.5 text-violet-500" />
            <h3 className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Device Platform Share</h3>
          </div>
          <div className="space-y-4">
            {data.deviceMetrics.map((item, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-xs font-bold text-zinc-500">
                  <span>{item.label}</span>
                  <span>{item.value} visits</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-zinc-200 dark:bg-zinc-800">
                  <div className="h-full rounded-full bg-violet-500" style={{ width: `${Math.min(100, item.value * 1.5)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Browser breakdown */}
        <div className="rounded-xl border border-border bg-card/25 p-5 backdrop-blur-md">
          <div className="flex items-center gap-2 mb-4">
            <Chrome className="h-4.5 w-4.5 text-violet-500" />
            <h3 className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Browser Distribution</h3>
          </div>
          <div className="space-y-4">
            {data.browserMetrics.map((item, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-xs font-bold text-zinc-500">
                  <span>{item.label}</span>
                  <span>{item.value} hits</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-zinc-200 dark:bg-zinc-800">
                  <div className="h-full rounded-full bg-blue-500" style={{ width: `${Math.min(100, item.value * 1.5)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tech Stack usage */}
        <div className="rounded-xl border border-border bg-card/25 p-5 backdrop-blur-md">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-4.5 w-4.5 text-violet-500" />
            <h3 className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Top Technologies In Projects</h3>
          </div>
          {data.techStackStats.length > 0 ? (
            <div className="space-y-4">
              {data.techStackStats.map((item, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs font-bold text-zinc-500">
                    <span>{item.label}</span>
                    <span>{item.value} Projects</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-zinc-200 dark:bg-zinc-800">
                    <div className="h-full rounded-full bg-emerald-500" style={{ width: `${(item.value / data.totals.projects) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-36 items-center justify-center text-xs font-bold text-zinc-400">
              No tech stack details logged.
            </div>
          )}
        </div>
      </div>

      {/* Users activity listings (Active vs Inactive) */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Most active */}
        <div className="rounded-xl border border-border bg-card/25 p-5 backdrop-blur-md">
          <div className="flex items-center gap-2 mb-4">
            <Award className="h-4.5 w-4.5 text-amber-500" />
            <h3 className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Top Platform Earners</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-semibold text-zinc-500">
              <thead>
                <tr className="border-b border-border/40 pb-2 text-[10px] uppercase text-zinc-400">
                  <th className="py-2">User</th>
                  <th className="py-2 text-center">Level</th>
                  <th className="py-2 text-right">Total XP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {data.mostActiveUsers.map((u) => (
                  <tr key={u.id}>
                    <td className="py-2.5 font-bold text-zinc-800 dark:text-zinc-200">{u.name}</td>
                    <td className="py-2.5 text-center font-bold text-violet-500">Lvl {u.level}</td>
                    <td className="py-2.5 text-right text-zinc-400">{u.xp} XP</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Inactive */}
        <div className="rounded-xl border border-border bg-card/25 p-5 backdrop-blur-md">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-4.5 w-4.5 text-rose-500" />
            <h3 className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Inactive Accounts (30+ Days)</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-semibold text-zinc-500">
              <thead>
                <tr className="border-b border-border/40 pb-2 text-[10px] uppercase text-zinc-400">
                  <th className="py-2">User</th>
                  <th className="py-2">Email</th>
                  <th className="py-2 text-right">Last Active</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {data.inactiveUsers.map((u) => (
                  <tr key={u.id}>
                    <td className="py-2.5 font-bold text-zinc-800 dark:text-zinc-200">{u.name}</td>
                    <td className="py-2.5">{u.email}</td>
                    <td className="py-2.5 text-right text-zinc-400">
                      {u.lastActive ? new Date(u.lastActive).toLocaleDateString() : 'Never'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
