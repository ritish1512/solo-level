'use client'

import React, { useEffect, useState, useTransition } from 'react'
import { fetchAdminUsers } from '@/actions/adminUserActions'
import UserDetailDrawer from '@/components/admin/UserDetailDrawer'
import {
  Search,
  Filter,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Shield,
  Loader2,
  Users,
  AlertCircle,
} from 'lucide-react'

type AdminUser = {
  id: string
  name: string
  email: string
  level: number
  xp: number
  streak: number
  role: 'user' | 'admin'
  status: 'active' | 'suspended'
  createdAt: string
}

export default function AdminUsersPage() {
  // Queries, filters, sorting, and pagination state
  const [search, setSearch] = useState('')
  const [role, setRole] = useState('all')
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(1)
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Data state
  const [data, setData] = useState<{ users: AdminUser[]; total: number; pages: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)
  const [isPending, startTransition] = useTransition()

  // Load user directories
  const loadUsers = async () => {
    setLoading(true)
    try {
      const result = await fetchAdminUsers({
        search,
        role,
        status,
        page,
        limit: 10,
        sortBy,
        sortOrder,
      })
      setData(result)
    } catch (err) {
      console.error('Failed to load user directories', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const id = setTimeout(() => loadUsers(), 0)
    return () => clearTimeout(id)
  }, [search, role, status, page, sortBy, sortOrder])

  // Trigger sorting
  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('desc')
    }
    setPage(1)
  }

  // Reload details when drawer triggers updates
  const handleUpdate = () => {
    loadUsers()
    // Refresh selectedUser state to reflect updates in drawer
    if (selectedUser) {
      const updated = data?.users.find((u) => u.id === selectedUser.id)
      if (updated) {
        setSelectedUser(updated)
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div>
        <h1 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-3xl">
          User Directory
        </h1>
        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
          Search, filter, audit, and configure platform accounts.
        </p>
      </div>

      {/* Query Filters Bar */}
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
            placeholder="Search accounts by name or email address..."
            className="w-full rounded-lg border border-border bg-zinc-50/50 py-2.5 pl-10 pr-4 text-xs font-semibold text-zinc-700 outline-none placeholder:text-zinc-400 focus:border-violet-500 dark:bg-zinc-950/20 dark:text-zinc-300"
          />
        </div>

        {/* Role select */}
        <div className="relative">
          <select
            value={role}
            onChange={(e) => {
              setRole(e.target.value)
              setPage(1)
            }}
            className="w-full rounded-lg border border-border bg-zinc-50/50 py-2.5 pl-4 pr-10 text-xs font-bold text-zinc-600 outline-none dark:bg-zinc-950/20 dark:text-zinc-400"
          >
            <option value="all">All Roles</option>
            <option value="user">Users</option>
            <option value="admin">Administrators</option>
          </select>
        </div>

        {/* Status select */}
        <div className="relative">
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value)
              setPage(1)
            }}
            className="w-full rounded-lg border border-border bg-zinc-50/50 py-2.5 pl-4 pr-10 text-xs font-bold text-zinc-600 outline-none dark:bg-zinc-950/20 dark:text-zinc-400"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </div>

      {/* Directory Table */}
      <div className="rounded-xl border border-border bg-card/25 backdrop-blur-md">
        {loading ? (
          <div className="flex h-64 items-center justify-center text-zinc-400" aria-label="Loading directory">
            <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
          </div>
        ) : data && data.users.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-semibold text-zinc-500">
              <thead>
                <tr className="border-b border-border/40 text-[10px] uppercase text-zinc-400">
                  <th className="cursor-pointer py-4 px-6 select-none" onClick={() => handleSort('name')}>
                    <span className="flex items-center gap-1 hover:text-zinc-800 dark:hover:text-zinc-200">
                      User Profile
                      <ArrowUpDown className="h-3 w-3" />
                    </span>
                  </th>
                  <th className="py-4 px-6 text-center">Level & XP</th>
                  <th className="cursor-pointer py-4 px-6 text-center select-none" onClick={() => handleSort('streak')}>
                    <span className="flex items-center justify-center gap-1 hover:text-zinc-800 dark:hover:text-zinc-200">
                      Streak
                      <ArrowUpDown className="h-3 w-3" />
                    </span>
                  </th>
                  <th className="py-4 px-6 text-center">Role</th>
                  <th className="py-4 px-6 text-center">Status</th>
                  <th className="cursor-pointer py-4 px-6 select-none" onClick={() => handleSort('createdAt')}>
                    <span className="flex items-center gap-1 hover:text-zinc-800 dark:hover:text-zinc-200">
                      Joined
                      <ArrowUpDown className="h-3 w-3" />
                    </span>
                  </th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {data.users.map((u) => (
                  <tr key={u.id} className="hover:bg-zinc-50/10 dark:hover:bg-zinc-800/10">
                    {/* Hero detail */}
                    <td className="py-4 px-6 font-bold text-zinc-800 dark:text-zinc-200">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-500/10 text-violet-500 font-extrabold">
                          {u.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-zinc-800 dark:text-zinc-200">{u.name}</p>
                          <p className="text-[10px] font-semibold text-zinc-400">{u.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Level / XP */}
                    <td className="py-4 px-6 text-center">
                      <span className="font-extrabold text-zinc-700 dark:text-zinc-300">Lvl {u.level}</span>
                      <span className="ml-1 text-[10px] font-semibold text-zinc-400">({u.xp} XP)</span>
                    </td>

                    {/* Streak */}
                    <td className="py-4 px-6 text-center font-black text-amber-500">
                      {u.streak} Days
                    </td>

                    {/* Role */}
                    <td className="py-4 px-6 text-center">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider ${
                          u.role === 'admin'
                            ? 'bg-rose-500/10 text-rose-500'
                            : 'bg-zinc-500/15 text-zinc-400'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-4 px-6 text-center">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider ${
                          u.status === 'suspended'
                            ? 'bg-amber-500/10 text-amber-500'
                            : 'bg-emerald-500/10 text-emerald-500'
                        }`}
                      >
                        {u.status}
                      </span>
                    </td>

                    {/* CreatedAt */}
                    <td className="py-4 px-6 text-zinc-400">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>

                    {/* Action trigger */}
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => setSelectedUser(u)}
                        className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-bold text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination Controls */}
            {data.pages > 1 && (
              <div className="flex items-center justify-between border-t border-border/20 px-6 py-4">
                <span className="text-[11px] font-bold text-zinc-400">
                  Showing page {page} of {data.pages} ({data.total} total members)
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
                    disabled={page === data.pages}
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
            <AlertCircle className="h-8 w-8 text-zinc-500" />
            <p className="text-xs font-bold">No accounts match your query parameters.</p>
          </div>
        )}
      </div>

      {/* Slide Drawer mounting */}
      {selectedUser && (
        <UserDetailDrawer
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onUpdate={handleUpdate}
        />
      )}
    </div>
  )
}
