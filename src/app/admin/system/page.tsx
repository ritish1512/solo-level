'use client'

import React, { useEffect, useState } from 'react'
import { useToast } from '@/components/ui/Toast'
import { fetchSystemDiagnostics, SystemDiagnostics } from '@/actions/adminSystemActions'
import {
  Activity,
  Database,
  Cpu,
  RefreshCw,
  HardDrive,
  CheckCircle2,
  XCircle,
  Clock,
  Terminal,
  Server,
  Play,
  Loader2,
} from 'lucide-react'

export default function AdminSystemPage() {
  const { toast } = useToast()
  const [data, setData] = useState<SystemDiagnostics | null>(null)
  const [loading, setLoading] = useState(true)
  const [pinging, setPinging] = useState(false)

  // API latency check state
  const [pings, setPings] = useState<Array<{ name: string; url: string; status: string; latency?: number }>>([
    { name: 'Profile API', url: '/api/user/profile', status: 'Untested' },
    { name: 'Cron Scheduler API', url: '/api/cron', status: 'Untested' },
    { name: 'Upload Service', url: '/api/upload', status: 'Untested' },
  ])

  // Mock deployment log history
  const deployments = [
    { version: 'v0.1.0', date: '2026-07-02 23:14:09', status: 'Completed', trigger: 'Git Push (main)' },
    { version: 'v0.0.9', date: '2026-07-02 18:30:00', status: 'Completed', trigger: 'Manual Trigger' },
  ]

  // Query diagnostics
  const loadDiagnostics = async () => {
    setLoading(true)
    try {
      const stats = await fetchSystemDiagnostics()
      setData(stats)
    } catch (err) {
      toast('Failed to load system diagnostics', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDiagnostics()
  }, [])

  // Execute API latency checks
  const handlePingServices = async () => {
    setPinging(true)
    toast('Executing ping checks on endpoint routes...', 'info')
    
    const updatedPings = [...pings]
    for (let i = 0; i < updatedPings.length; i++) {
      const start = Date.now()
      try {
        const res = await fetch(updatedPings[i].url, { method: 'GET', headers: { 'Cache-Control': 'no-cache' } })
        const latency = Date.now() - start
        updatedPings[i] = {
          ...updatedPings[i],
          status: res.status === 200 || res.status === 401 || res.status === 405 ? 'Responsive' : 'Degraded',
          latency,
        }
      } catch (err) {
        updatedPings[i] = {
          ...updatedPings[i],
          status: 'Offline',
          latency: Date.now() - start,
        }
      }
    }
    setPings(updatedPings)
    setPinging(false)
    toast('API ping scans completed!', 'success')
  }

  // Format uptime to string
  const formatUptime = (sec: number) => {
    const d = Math.floor(sec / (24 * 3600))
    const h = Math.floor((sec % (24 * 3600)) / 3600)
    const m = Math.floor((sec % 3600) / 60)
    return `${d}d ${h}h ${m}m`
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-zinc-400" aria-label="Loading system diagnostics">
        <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex h-64 flex-col items-center justify-center text-zinc-400 gap-2">
        <Activity className="h-8 w-8 text-rose-500 animate-pulse" />
        <p className="text-xs font-bold">Failed to load platform diagnostics logs.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-3xl">
            System Diagnostics
          </h1>
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Platform server health checks, database tables, and environment logs.
          </p>
        </div>

        <button
          onClick={loadDiagnostics}
          className="flex min-h-10 items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 text-xs font-bold transition-all hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh Diagnostics
        </button>
      </div>

      {/* Grid: Host vs Database Baseline */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Host diagnostics */}
        <div className="rounded-xl border border-border bg-card/25 p-5 backdrop-blur-md space-y-4">
          <div className="flex items-center gap-2 border-b border-border/40 pb-3">
            <Server className="h-4.5 w-4.5 text-violet-500" />
            <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Host Engine (Node.js OS)</h3>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-zinc-500">
            <div>
              <p className="text-[10px] text-zinc-400 uppercase">Application Uptime</p>
              <p className="mt-1 text-zinc-700 dark:text-zinc-300 font-bold">{formatUptime(data.uptimeSeconds)}</p>
            </div>
            <div>
              <p className="text-[10px] text-zinc-400 uppercase">Node.js Version</p>
              <p className="mt-1 font-mono text-zinc-700 dark:text-zinc-300 font-bold">{data.nodeVersion}</p>
            </div>
            <div>
              <p className="text-[10px] text-zinc-400 uppercase">Server System OS</p>
              <p className="mt-1 text-zinc-700 dark:text-zinc-300 font-bold">{data.osType} ({data.cpuArchitecture})</p>
            </div>
            <div>
              <p className="text-[10px] text-zinc-400 uppercase">CPU Core Threads</p>
              <p className="mt-1 text-zinc-700 dark:text-zinc-300 font-bold">{data.cpuCores} Threads</p>
            </div>
            <div className="col-span-2 space-y-1 border-t border-border/30 pt-3">
              <div className="flex justify-between text-[10px] uppercase text-zinc-400">
                <span>Free host Memory</span>
                <span className="font-mono">{data.freeMemoryMb} MB / {data.totalMemoryMb} MB</span>
              </div>
              <div className="h-2 w-full rounded-full bg-zinc-200 dark:bg-zinc-800">
                <div
                  className="h-full rounded-full bg-violet-500 transition-all duration-300"
                  style={{ width: `${((data.totalMemoryMb - data.freeMemoryMb) / data.totalMemoryMb) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Database diagnostics */}
        <div className="rounded-xl border border-border bg-card/25 p-5 backdrop-blur-md space-y-4">
          <div className="flex items-center gap-2 border-b border-border/40 pb-3">
            <Database className="h-4.5 w-4.5 text-violet-500" />
            <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Database Engine (MongoDB)</h3>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-zinc-500">
            <div>
              <p className="text-[10px] text-zinc-400 uppercase">Connection State</p>
              <p className="mt-1 flex items-center gap-1.5 font-bold text-emerald-500">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                {data.db.connectionState}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-zinc-400 uppercase">Collections Count</p>
              <p className="mt-1 text-zinc-700 dark:text-zinc-300 font-bold">{data.db.collectionsCount} collections</p>
            </div>
            <div>
              <p className="text-[10px] text-zinc-400 uppercase">Database Data Footprint</p>
              <p className="mt-1 text-zinc-700 dark:text-zinc-300 font-bold">{data.db.dataSizeMb} MB</p>
            </div>
            <div>
              <p className="text-[10px] text-zinc-400 uppercase">Document Records</p>
              <p className="mt-1 text-zinc-700 dark:text-zinc-300 font-bold">{data.db.objectsCount} records</p>
            </div>
            <div>
              <p className="text-[10px] text-zinc-400 uppercase">Physical Storage Footprint</p>
              <p className="mt-1 text-zinc-700 dark:text-zinc-300 font-bold">{data.db.storageSizeMb} MB</p>
            </div>
          </div>
        </div>
      </div>

      {/* Database collection details list */}
      <div className="rounded-xl border border-border bg-card/25 p-5 backdrop-blur-md space-y-4">
        <div className="flex items-center gap-2 border-b border-border/40 pb-3">
          <HardDrive className="h-4.5 w-4.5 text-violet-500" />
          <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Database Collections Registry</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-semibold text-zinc-500">
            <thead>
              <tr className="border-b border-border/40 text-[10px] uppercase text-zinc-400">
                <th className="py-2">Collection</th>
                <th className="py-2 text-center">Documents</th>
                <th className="py-2 text-center">Data Size</th>
                <th className="py-2 text-center">Storage Size</th>
                <th className="py-2 text-right">Indexes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20 font-medium">
              {data.db.collections.map((col, idx) => (
                <tr key={idx} className="hover:bg-zinc-50/10 dark:hover:bg-zinc-800/10">
                  <td className="py-2.5 font-bold text-zinc-800 dark:text-zinc-200">{col.name}</td>
                  <td className="py-2.5 text-center font-bold text-violet-500">{col.count}</td>
                  <td className="py-2.5 text-center">{col.sizeKb} KB</td>
                  <td className="py-2.5 text-center">{col.storageSizeKb} KB</td>
                  <td className="py-2.5 text-right font-mono text-zinc-400">{col.indexesCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Grid: API Latency check vs Deployments */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Endpoints latency check */}
        <div className="rounded-xl border border-border bg-card/25 p-5 backdrop-blur-md space-y-4">
          <div className="flex items-center justify-between border-b border-border/40 pb-3">
            <div className="flex items-center gap-2">
              <Activity className="h-4.5 w-4.5 text-violet-500" />
              <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">API Endpoint Latencies</h3>
            </div>
            <button
              onClick={handlePingServices}
              disabled={pinging}
              className="flex min-h-8 items-center justify-center gap-1.5 rounded-lg bg-violet-600 px-3 text-[10px] font-bold text-white shadow hover:bg-violet-700 disabled:opacity-50"
            >
              {pinging ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
              Ping Routes
            </button>
          </div>

          <div className="space-y-3">
            {pings.map((p, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs font-semibold text-zinc-500">
                <div>
                  <p className="font-bold text-zinc-800 dark:text-zinc-200">{p.name}</p>
                  <p className="text-[10px] font-mono text-zinc-400">{p.url}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`rounded px-1.5 py-0.5 text-[9px] font-extrabold uppercase ${
                      p.status === 'Responsive'
                        ? 'bg-emerald-500/10 text-emerald-500'
                        : p.status === 'Offline'
                        ? 'bg-rose-500/10 text-rose-500'
                        : 'bg-zinc-500/10 text-zinc-400'
                    }`}
                  >
                    {p.status}
                  </span>
                  {p.latency !== undefined && (
                    <span className="font-mono font-bold text-zinc-600 dark:text-zinc-400">
                      {p.latency} ms
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Deployments log */}
        <div className="rounded-xl border border-border bg-card/25 p-5 backdrop-blur-md space-y-4">
          <div className="flex items-center gap-2 border-b border-border/40 pb-3">
            <Terminal className="h-4.5 w-4.5 text-violet-500" />
            <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Recent Platform Deployments</h3>
          </div>

          <div className="space-y-3">
            {deployments.map((d, idx) => (
              <div key={idx} className="flex justify-between text-xs font-semibold text-zinc-500">
                <div>
                  <p className="font-bold text-zinc-800 dark:text-zinc-200">
                    Console Engine Update {d.version}
                  </p>
                  <p className="text-[10px] text-zinc-400 font-mono">Triggered via: {d.trigger}</p>
                </div>
                <div className="text-right">
                  <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-extrabold uppercase text-emerald-500">
                    {d.status}
                  </span>
                  <p className="text-[10px] text-zinc-400 mt-1">{new Date(d.date).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
