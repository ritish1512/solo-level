'use client'

import React, { useEffect, useState } from 'react'
import { useToast } from '@/components/ui/Toast'
import {
  fetchAdminAuditLogs,
  fetchUniqueAuditActions,
  AuditLogItem,
} from '@/actions/adminAuditLogActions'
import {
  History,
  Search,
  Download,
  AlertCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Shield,
  Laptop,
  CheckCircle2,
  XCircle,
  Info,
} from 'lucide-react'

export default function AdminAuditLogsPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)

  // Filters & Page state
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('all')
  const [resultFilter, setResultFilter] = useState('all')
  const [page, setPage] = useState(1)

  // Data states
  const [logsData, setLogsData] = useState<{ logs: AuditLogItem[]; total: number; pages: number } | null>(null)
  const [uniqueActions, setUniqueActions] = useState<string[]>([])

  // Load audit logs
  const loadLogs = async () => {
    setLoading(true)
    try {
      const [logs, actions] = await Promise.all([
        fetchAdminAuditLogs({
          search,
          action: actionFilter,
          result: resultFilter,
          page,
          limit: 15,
        }),
        fetchUniqueAuditActions(),
      ])

      setLogsData(logs)
      setUniqueActions(actions)
    } catch (err) {
      toast('Failed to load system audit trails', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const id = setTimeout(() => loadLogs(), 0)
    return () => clearTimeout(id)
  }, [search, actionFilter, resultFilter, page])

  // Export current logs grid as CSV
  const handleExportCSV = () => {
    if (!logsData || logsData.logs.length === 0) return
    try {
      const csvContent = [
        ['Timestamp', 'Admin Name', 'Admin Email', 'Action', 'Target', 'Collection', 'Details', 'IP Address', 'Browser', 'Device', 'Result'],
        ...logsData.logs.map((l) => [
          l.timestamp,
          l.adminName,
          l.adminEmail,
          l.action,
          l.target || '',
          l.collectionName || '',
          l.details || '',
          l.ipAddress || '',
          l.browser || '',
          l.device || '',
          l.result,
        ]),
      ]
        .map((row) => row.map((val) => `"${val.replace(/"/g, '""')}"`).join(','))
        .join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.setAttribute('href', url)
      link.setAttribute('download', `system-audit-logs-${new Date().toISOString().slice(0, 10)}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      toast('Audit logs CSV exported!', 'success')
    } catch (err) {
      toast('Failed to export CSV', 'error')
    }
  }

  if (loading && !logsData) {
    return (
      <div className="flex h-screen items-center justify-center text-zinc-400" aria-label="Loading audit logs">
        <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-3xl">
            Audit Trails
          </h1>
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Real-time compliance monitoring logs of all administrative workspace operations.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          disabled={!logsData || logsData.logs.length === 0}
          className="flex min-h-10 items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 text-xs font-bold text-white shadow transition-all hover:bg-violet-700 disabled:opacity-50"
        >
          <Download className="h-3.5 w-3.5" />
          Export Audit Logs CSV
        </button>
      </div>

      {/* Query Filters bar */}
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
            placeholder="Search logs by admin, action name, target ID, or notes details..."
            className="w-full rounded-lg border border-border bg-zinc-50/50 py-2.5 pl-10 pr-4 text-xs font-semibold text-zinc-700 outline-none placeholder:text-zinc-400 focus:border-violet-500 dark:bg-zinc-950/20 dark:text-zinc-300"
          />
        </div>

        {/* Action Select */}
        <div className="relative">
          <select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value)
              setPage(1)
            }}
            className="w-full rounded-lg border border-border bg-zinc-50/50 py-2.5 pl-4 pr-10 text-xs font-bold text-zinc-600 outline-none dark:bg-zinc-950/20 dark:text-zinc-400"
          >
            <option value="all">All Actions</option>
            {uniqueActions.map((action) => (
              <option key={action} value={action}>
                {action}
              </option>
            ))}
          </select>
        </div>

        {/* Result Select */}
        <div className="relative">
          <select
            value={resultFilter}
            onChange={(e) => {
              setResultFilter(e.target.value)
              setPage(1)
            }}
            className="w-full rounded-lg border border-border bg-zinc-50/50 py-2.5 pl-4 pr-10 text-xs font-bold text-zinc-600 outline-none dark:bg-zinc-950/20 dark:text-zinc-400"
          >
            <option value="all">All Results</option>
            <option value="Success">Success</option>
            <option value="Failure">Failure</option>
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
            <table className="w-full text-left text-xs font-semibold text-zinc-500 table-auto">
              <thead>
                <tr className="border-b border-border/40 text-[10px] uppercase text-zinc-400">
                  <th className="py-4 px-6">Timestamp</th>
                  <th className="py-4 px-6">Admin</th>
                  <th className="py-4 px-6">Action</th>
                  <th className="py-4 px-6">Notes / Details</th>
                  <th className="py-4 px-6">Connection Details</th>
                  <th className="py-4 px-6 text-center">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20 font-medium text-zinc-600 dark:text-zinc-400">
                {logsData.logs.map((log) => (
                  <tr key={log.id} className="hover:bg-zinc-50/10 dark:hover:bg-zinc-800/10">
                    {/* Timestamp */}
                    <td className="py-4 px-6 text-zinc-400">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>

                    {/* Admin name/email */}
                    <td className="py-4 px-6">
                      <p className="font-bold text-zinc-800 dark:text-zinc-200">{log.adminName}</p>
                      <p className="text-[10px] text-zinc-400">{log.adminEmail}</p>
                    </td>

                    {/* Action */}
                    <td className="py-4 px-6">
                      <span className="font-mono text-[10px] font-bold text-violet-500 uppercase tracking-wide">
                        {log.action}
                      </span>
                    </td>

                    {/* Details notes */}
                    <td className="py-4 px-6 max-w-xs truncate" title={log.details}>
                      {log.details || 'No details recorded.'}
                    </td>

                    {/* Client Device/Browser/IP */}
                    <td className="py-4 px-6 text-[10px]">
                      <p className="font-bold text-zinc-700 dark:text-zinc-300">IP: {log.ipAddress}</p>
                      <p className="text-zinc-400 flex items-center gap-1 mt-0.5">
                        <Laptop className="h-3.5 w-3.5" />
                        {log.browser} ({log.device})
                      </p>
                    </td>

                    {/* Result status */}
                    <td className="py-4 px-6 text-center">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[9px] font-extrabold uppercase flex items-center justify-center gap-1 w-20 mx-auto ${
                          log.result === 'Success'
                            ? 'bg-emerald-500/10 text-emerald-500'
                            : 'bg-rose-500/10 text-rose-500'
                        }`}
                      >
                        {log.result === 'Success' ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                        {log.result}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination controls */}
            {logsData.pages > 1 && (
              <div className="flex items-center justify-between border-t border-border/20 px-6 py-4">
                <span className="text-[11px] font-bold text-zinc-400">
                  Showing page {page} of {logsData.pages} ({logsData.total} logs)
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-zinc-500 hover:bg-zinc-100 disabled:opacity-50 dark:hover:bg-zinc-800"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    disabled={page === logsData.pages}
                    onClick={() => setPage(page + 1)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-zinc-500 hover:bg-zinc-100 disabled:opacity-50 dark:hover:bg-zinc-800"
                    aria-label="Next page"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex h-64 flex-col items-center justify-center text-zinc-400 gap-2">
            <Info className="h-8 w-8 text-zinc-500" />
            <p className="text-xs font-bold">No compliance audit logs recorded matching criteria.</p>
          </div>
        )}
      </div>
    </div>
  )
}
