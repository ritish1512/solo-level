'use client'

import React, { useEffect, useState, useTransition } from 'react'
import { useToast } from '@/components/ui/Toast'
import {
  fetchAdminSupportTickets,
  updateTicketStatusAction,
  updateTicketPriorityAction,
  assignTicketAction,
  updateTicketNotesAction,
  SupportItem,
} from '@/actions/adminSupportActions'
import {
  LifeBuoy,
  Search,
  CheckCircle,
  Clock,
  AlertTriangle,
  Loader2,
  Paperclip,
  CheckCircle2,
  AlertOctagon,
  User,
  ArrowRight,
  FileText,
} from 'lucide-react'

export default function AdminSupportPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [isPending, startTransition] = useTransition()

  // Query states
  const [type, setType] = useState('all')
  const [status, setStatus] = useState('all')
  const [priority, setPriority] = useState('all')

  // Tickets state
  const [tickets, setTickets] = useState<SupportItem[]>([])
  const [selectedTicket, setSelectedTicket] = useState<SupportItem | null>(null)

  // Admin user sessions cache for assignment
  const [admins, setAdmins] = useState<Array<{ id: string; name: string }>>([])
  
  // Internal notes local state
  const [localNotes, setLocalNotes] = useState('')

  // Load support records
  const loadTickets = async () => {
    setLoading(true)
    try {
      const logs = await fetchAdminSupportTickets({ type, status, priority })
      setTickets(logs)
      
      // Update selected ticket in place if currently open
      if (selectedTicket) {
        const updated = logs.find((t) => t.id === selectedTicket.id && t.isBug === selectedTicket.isBug)
        if (updated) {
          setSelectedTicket(updated)
          setLocalNotes(updated.internalNotes || '')
        }
      }
    } catch (err) {
      toast('Failed to query support tickets', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Load admins list for dropdown selection
  const loadAdmins = async () => {
    try {
      const res = await fetch('/api/user/profile') // fetch self
      if (res.ok) {
        const user = await res.json()
        if (user.role === 'admin') {
          // Add self as available option
          setAdmins([{ id: user.id || 'current', name: user.name }])
        }
      }
    } catch (err) {
      console.warn('Could not cache admin session', err)
    }
  }

  useEffect(() => {
    const id = setTimeout(() => loadTickets(), 0)
    return () => clearTimeout(id)
  }, [type, status, priority])

  useEffect(() => {
    const id = setTimeout(() => loadAdmins(), 0)
    return () => clearTimeout(id)
  }, [])

  // Handle status update
  const handleStatusChange = async (targetStatus: 'Open' | 'In Progress' | 'Resolved') => {
    if (!selectedTicket) return
    startTransition(async () => {
      const res = await updateTicketStatusAction(
        selectedTicket.id,
        selectedTicket.isBug,
        targetStatus
      )
      if (res.success) {
        toast(`Ticket status updated: ${targetStatus}`, 'success')
        loadTickets()
      } else {
        toast(res.error || 'Failed to update status', 'error')
      }
    })
  }

  // Handle priority update
  const handlePriorityChange = async (targetPriority: 'Low' | 'Medium' | 'High' | 'Critical') => {
    if (!selectedTicket) return
    startTransition(async () => {
      const res = await updateTicketPriorityAction(
        selectedTicket.id,
        selectedTicket.isBug,
        targetPriority
      )
      if (res.success) {
        toast(`Ticket priority updated: ${targetPriority}`, 'success')
        loadTickets()
      } else {
        toast(res.error || 'Failed to update priority', 'error')
      }
    })
  }

  // Handle assignment
  const handleAssign = async (adminId: string) => {
    if (!selectedTicket) return
    if (selectedTicket.isBug) {
      toast('Bugs cannot currently be assigned in database schema.', 'error')
      return
    }

    startTransition(async () => {
      const res = await assignTicketAction(selectedTicket.id, selectedTicket.isBug, adminId)
      if (res.success) {
        toast('Ticket assignment saved successfully!', 'success')
        loadTickets()
      } else {
        toast(res.error || 'Failed to assign ticket', 'error')
      }
    })
  }

  // Handle notes save
  const handleSaveNotes = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTicket) return
    if (selectedTicket.isBug) {
      toast('Bug reports do not support internal notes in Mongoose schema.', 'error')
      return
    }

    startTransition(async () => {
      const res = await updateTicketNotesAction(
        selectedTicket.id,
        selectedTicket.isBug,
        localNotes
      )
      if (res.success) {
        toast('Internal notes updated!', 'success')
        loadTickets()
      } else {
        toast(res.error || 'Failed to save notes', 'error')
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div>
        <h1 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-3xl">
          Support Triage
        </h1>
        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
          Manage contact inquiries, resolve bug reports, and track feature requests.
        </p>
      </div>

      {/* Query Filters bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card/20 p-4 backdrop-blur-md sm:flex-row sm:items-center">
        {/* Type select */}
        <div className="relative">
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full rounded-lg border border-border bg-zinc-50/50 py-2.5 pl-4 pr-10 text-xs font-bold text-zinc-600 outline-none dark:bg-zinc-950/20 dark:text-zinc-400"
          >
            <option value="all">All Inquiries</option>
            <option value="Contact Message">Contact Messages</option>
            <option value="Bug Report">Bug Reports</option>
            <option value="Feature Request">Feature Requests</option>
          </select>
        </div>

        {/* Status select */}
        <div className="relative">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full rounded-lg border border-border bg-zinc-50/50 py-2.5 pl-4 pr-10 text-xs font-bold text-zinc-600 outline-none dark:bg-zinc-950/20 dark:text-zinc-400"
          >
            <option value="all">All Statuses</option>
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
          </select>
        </div>

        {/* Priority select */}
        <div className="relative">
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="w-full rounded-lg border border-border bg-zinc-50/50 py-2.5 pl-4 pr-10 text-xs font-bold text-zinc-600 outline-none dark:bg-zinc-950/20 dark:text-zinc-400"
          >
            <option value="all">All Severities</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Critical">Critical</option>
          </select>
        </div>
      </div>

      {/* Grid: Tickets List vs Detail Panel */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left side: Tickets listing */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card/25 backdrop-blur-md overflow-hidden">
          {loading ? (
            <div className="flex h-64 items-center justify-center text-zinc-400" aria-label="Loading tickets">
              <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
            </div>
          ) : tickets.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-semibold text-zinc-500">
                <thead>
                  <tr className="border-b border-border/40 text-[10px] uppercase text-zinc-400">
                    <th className="py-4 px-6">Author</th>
                    <th className="py-4 px-6">Topic Subject</th>
                    <th className="py-4 px-6 text-center">Severity</th>
                    <th className="py-4 px-6 text-center">Status</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {tickets.map((t) => (
                    <tr
                      key={t.id}
                      className={`hover:bg-zinc-50/10 dark:hover:bg-zinc-800/10 cursor-pointer ${
                        selectedTicket?.id === t.id && selectedTicket?.isBug === t.isBug
                          ? 'bg-violet-500/5'
                          : ''
                      }`}
                      onClick={() => {
                        setSelectedTicket(t)
                        setLocalNotes(t.internalNotes || '')
                      }}
                    >
                      <td className="py-4 px-6">
                        <p className="font-bold text-zinc-800 dark:text-zinc-200">{t.userName}</p>
                        <p className="text-[10px] font-semibold text-zinc-400">{t.userEmail}</p>
                      </td>
                      <td className="py-4 px-6 min-w-[200px]">
                        <span className="text-[10px] font-extrabold uppercase text-violet-500 block">
                          {t.type}
                        </span>
                        <p className="text-zinc-700 dark:text-zinc-300 font-bold truncate mt-0.5" title={t.title}>
                          {t.title}
                        </p>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[9px] font-extrabold uppercase ${
                            t.priority === 'Critical'
                              ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                              : t.priority === 'High'
                              ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                              : t.priority === 'Medium'
                              ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                              : 'bg-zinc-500/10 text-zinc-400'
                          }`}
                        >
                          {t.priority}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[9px] font-extrabold uppercase ${
                            t.status === 'Resolved'
                              ? 'bg-emerald-500/10 text-emerald-500'
                              : t.status === 'In Progress'
                              ? 'bg-blue-500/10 text-blue-500'
                              : 'bg-zinc-500/15 text-zinc-400'
                          }`}
                        >
                          {t.status}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <ArrowRight className="h-4 w-4 text-zinc-400 ml-auto" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex h-64 flex-col items-center justify-center text-zinc-400 gap-2">
              <LifeBuoy className="h-8 w-8 text-zinc-500" />
              <p className="text-xs font-bold">No active support inquiries reported.</p>
            </div>
          )}
        </div>

        {/* Right side: Detailed ticket inspector panel */}
        <div className="rounded-xl border border-border bg-card/25 p-6 backdrop-blur-md h-fit">
          {selectedTicket ? (
            <div className="space-y-5">
              {/* Ticket description */}
              <div>
                <span className="text-[9px] font-black uppercase tracking-wider text-violet-500">
                  {selectedTicket.type}
                </span>
                <h3 className="text-sm font-black text-zinc-800 dark:text-zinc-200 mt-1">
                  {selectedTicket.title}
                </h3>
                <p className="text-[10px] font-semibold text-zinc-400 mt-0.5">
                  Reported by {selectedTicket.userName} ({selectedTicket.userEmail}) on{' '}
                  {new Date(selectedTicket.createdAt).toLocaleDateString()}
                </p>

                <div className="mt-4 rounded-lg border border-border bg-zinc-50/50 p-3 text-xs font-semibold text-zinc-700 leading-relaxed dark:bg-zinc-950/20 dark:text-zinc-300">
                  {selectedTicket.description || 'No description provided.'}
                </div>
              </div>

              {/* Attachments preview */}
              {selectedTicket.attachments.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400">
                    Attachments
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedTicket.attachments.map((url, idx) => (
                      <a
                        key={idx}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 rounded border border-border bg-card px-2.5 py-1 text-[10px] font-bold text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:hover:bg-zinc-800/40"
                      >
                        <Paperclip className="h-3 w-3 text-violet-500" />
                        Attachment {idx + 1}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Triage controls */}
              <div className="border-t border-border/40 pt-4 space-y-4">
                <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400">
                  Triage Panel
                </h4>

                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Status update */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-zinc-500">Ticket Status</label>
                    <select
                      value={selectedTicket.status}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleStatusChange(e.target.value as 'Open' | 'In Progress' | 'Resolved')}
                      className="w-full rounded-lg border border-border bg-zinc-50/50 p-2 text-xs font-bold text-zinc-600 outline-none dark:bg-zinc-950/20 dark:text-zinc-400"
                    >
                      <option value="Open">Open</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Resolved">Resolved</option>
                    </select>
                  </div>

                  {/* Priority update */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-zinc-500">Priority Level</label>
                    <select
                      value={selectedTicket.priority}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handlePriorityChange(e.target.value as 'Low' | 'Medium' | 'High' | 'Critical')}
                      className="w-full rounded-lg border border-border bg-zinc-50/50 p-2 text-xs font-bold text-zinc-600 outline-none dark:bg-zinc-950/20 dark:text-zinc-400"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Critical">Critical</option>
                    </select>
                  </div>
                </div>

                {/* Assignment dropdown */}
                {!selectedTicket.isBug && (
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-zinc-500">Assigned Agent</label>
                    <select
                      value={selectedTicket.assignedName ? 'current' : ''}
                      onChange={(e) => handleAssign(e.target.value)}
                      className="w-full rounded-lg border border-border bg-zinc-50/50 p-2 text-xs font-bold text-zinc-600 outline-none dark:bg-zinc-950/20 dark:text-zinc-400"
                    >
                      <option value="">Unassigned</option>
                      {admins.map((admin) => (
                        <option key={admin.id} value={admin.id}>
                          {admin.name} (Self)
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Internal Notes */}
              {!selectedTicket.isBug && (
                <form onSubmit={handleSaveNotes} className="border-t border-border/40 pt-4 space-y-2">
                  <label className="block text-[10px] font-extrabold text-zinc-400 uppercase">
                    Internal Notes
                  </label>
                  <textarea
                    value={localNotes}
                    onChange={(e) => setLocalNotes(e.target.value)}
                    placeholder="Write private administrative notes regarding resolutions..."
                    rows={3}
                    className="w-full rounded-lg border border-border bg-zinc-50/50 p-2.5 text-xs font-semibold text-zinc-700 outline-none focus:border-violet-500 dark:bg-zinc-950/20 dark:text-zinc-300"
                  />
                  <button
                    type="submit"
                    disabled={isPending || localNotes === selectedTicket.internalNotes}
                    className="flex min-h-9 items-center justify-center gap-1.5 rounded-lg bg-violet-600 px-4 text-xs font-bold text-white shadow hover:bg-violet-700 disabled:opacity-50"
                  >
                    Save Notes
                  </button>
                </form>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-zinc-400 text-xs font-bold gap-1.5">
              <LifeBuoy className="h-8 w-8 text-zinc-500 animate-pulse" />
              Select an inquiry item to view triage logs.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
