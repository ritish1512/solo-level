'use client'

import React, { useEffect, useState } from 'react'
import { useToast } from '@/components/ui/Toast'
import {
  fetchUserActivitySummary,
  toggleUserStatusAction,
  changeUserRoleAction,
  resetUserPasswordAction,
  sendUserVerificationEmailAction,
  deleteUserAction,
  UserActivitySummary,
} from '@/actions/adminUserActions'
import {
  X,
  User,
  Shield,
  Clock,
  Award,
  Zap,
  Activity,
  Trash2,
  Mail,
  Lock,
  Unlock,
  AlertTriangle,
  Loader2,
} from 'lucide-react'

interface UserDetailDrawerProps {
  user: {
    id: string
    name: string
    email: string
    role: 'user' | 'admin'
    status: 'active' | 'suspended'
    level: number
    xp: number
    streak: number
    createdAt: string
  }
  onClose: () => void
  onUpdate: () => void
}

export default function UserDetailDrawer({ user, onClose, onUpdate }: UserDetailDrawerProps) {
  const { toast } = useToast()
  
  // Loading and stats state
  const [summary, setSummary] = useState<UserActivitySummary | null>(null)
  const [loadingStats, setLoadingStats] = useState(true)
  const [updating, setUpdating] = useState(false)

  // Interactive forms state
  const [newPassword, setNewPassword] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Fetch productivity details on mount/user change
  useEffect(() => {
    async function loadStats() {
      setLoadingStats(true)
      try {
        const stats = await fetchUserActivitySummary(user.id)
        setSummary(stats)
      } catch (err) {
        console.error('Failed to load activity summary', err)
        toast('Failed to load user analytics', 'error')
      } finally {
        setLoadingStats(false)
      }
    }
    loadStats()
  }, [user.id])

  // Toggle user account active/suspended state
  const handleToggleStatus = async () => {
    const nextStatus = user.status === 'suspended' ? 'active' : 'suspended'
    setUpdating(true)
    try {
      const res = await toggleUserStatusAction(user.id, nextStatus)
      if (res.success) {
        toast(`Account is now ${nextStatus}`, 'success')
        onUpdate()
      } else {
        toast(res.error || 'Failed to update status', 'error')
      }
    } catch (err) {
      toast('Failed to complete status update', 'error')
    } finally {
      setUpdating(false)
    }
  }

  // Toggle role between user and admin
  const handleToggleRole = async () => {
    const nextRole = user.role === 'admin' ? 'user' : 'admin'
    setUpdating(true)
    try {
      const res = await changeUserRoleAction(user.id, nextRole)
      if (res.success) {
        toast(`Role updated to ${nextRole}`, 'success')
        onUpdate()
      } else {
        toast(res.error || 'Failed to update role', 'error')
      }
    } catch (err) {
      toast('Failed to update role', 'error')
    } finally {
      setUpdating(false)
    }
  }

  // Reset password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPassword.trim() || newPassword.length < 6) {
      toast('Password must be at least 6 characters', 'error')
      return
    }

    setUpdating(true)
    try {
      const res = await resetUserPasswordAction(user.id, newPassword)
      if (res.success) {
        toast(res.message || 'Password updated successfully!', 'success')
        setNewPassword('')
      } else {
        toast(res.error || 'Failed to reset password', 'error')
      }
    } catch (err) {
      toast('Failed to complete password reset', 'error')
    } finally {
      setUpdating(false)
    }
  }

  // Send verification email
  const handleSendVerification = async () => {
    setUpdating(true)
    try {
      const res = await sendUserVerificationEmailAction(user.id)
      if (res.success) {
        toast(res.message || 'Verification link sent!', 'success')
      } else {
        toast(res.error || 'Failed to send verification link', 'error')
      }
    } catch (err) {
      toast('Error sending email', 'error')
    } finally {
      setUpdating(false)
    }
  }

  // Delete user account permanently
  const handleDeleteUser = async () => {
    if (!confirmDelete) return

    setUpdating(true)
    try {
      const res = await deleteUserAction(user.id)
      if (res.success) {
        toast('User account permanently deleted', 'success')
        onClose()
        onUpdate()
      } else {
        toast(res.error || 'Failed to delete account', 'error')
      }
    } catch (err) {
      toast('Failed to complete account deletion', 'error')
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end animate-fade-in" role="dialog" aria-modal="true" aria-label="User detail card">
      {/* Backdrop */}
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-label="Close user panel"
      />

      {/* Slide-over Drawer Panel */}
      <aside className="relative flex h-full w-full max-w-md flex-col border-l border-border bg-card shadow-2xl animate-slide-in">
        {/* Header bar */}
        <div className="flex items-center justify-between border-b border-border/40 p-5">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-violet-500" />
            <h2 className="text-sm font-black uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
              User Profile Deck
            </h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/60 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
            aria-label="Close detail panel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable workspace */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* User Hero Stats */}
          <div className="flex flex-col items-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-violet-500/10 text-violet-500 ring-4 ring-violet-500/15">
              <User className="h-8 w-8" />
            </div>

            <h3 className="mt-4 text-lg font-black text-zinc-800 dark:text-zinc-100">{user.name}</h3>
            <p className="text-xs font-semibold text-zinc-400">{user.email}</p>

            <div className="mt-3 flex gap-2">
              <span className={`rounded-full px-2.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider ${
                user.role === 'admin' ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' : 'bg-zinc-500/10 text-zinc-400 border border-border/30'
              }`}>
                {user.role}
              </span>
              <span className={`rounded-full px-2.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider ${
                user.status === 'suspended' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
              }`}>
                {user.status}
              </span>
            </div>
          </div>

          {/* Level Progress Stats */}
          <div className="rounded-xl border border-border/50 bg-zinc-50/50 p-4 dark:bg-zinc-900/10 space-y-3">
            <div className="flex justify-between items-center text-xs font-bold text-zinc-500">
              <div className="flex items-center gap-1.5">
                <Award className="h-4 w-4 text-violet-500" />
                <span>Level {user.level}</span>
              </div>
              <div className="flex items-center gap-1">
                <Zap className="h-3.5 w-3.5 text-amber-500" />
                <span>{user.streak} day streak</span>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-bold text-zinc-400">
                <span>XP Progress</span>
                <span>{user.xp % 100} / 100</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-400"
                  style={{ width: `${user.xp % 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Activity summary block */}
          <div className="space-y-3">
            <h4 className="text-xs font-extrabold uppercase tracking-widest text-zinc-400">
              Operational Statistics
            </h4>
            
            {loadingStats ? (
              <div className="flex h-20 items-center justify-center text-zinc-400" aria-label="Loading stats">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : summary ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-border p-3">
                  <p className="text-[10px] font-extrabold text-zinc-400 uppercase">Tasks Logged</p>
                  <p className="mt-1 text-base font-black text-zinc-700 dark:text-zinc-200">
                    {summary.tasks.total}{' '}
                    <span className="text-xs font-bold text-zinc-400">({summary.tasks.completed} done)</span>
                  </p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-[10px] font-extrabold text-zinc-400 uppercase">Projects</p>
                  <p className="mt-1 text-base font-black text-zinc-700 dark:text-zinc-200">{summary.projects.total}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-[10px] font-extrabold text-zinc-400 uppercase">Habits Tracked</p>
                  <p className="mt-1 text-base font-black text-zinc-700 dark:text-zinc-200">
                    {summary.habits.total}{' '}
                    <span className="text-xs font-bold text-zinc-400">({summary.habits.activeStreak} active)</span>
                  </p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-[10px] font-extrabold text-zinc-400 uppercase">Quick Notes</p>
                  <p className="mt-1 text-base font-black text-zinc-700 dark:text-zinc-200">{summary.notes.total}</p>
                </div>
              </div>
            ) : (
              <div className="text-xs text-zinc-400">Failed to fetch activity logs.</div>
            )}
          </div>

          {/* Action Operations Control panel */}
          <div className="border-t border-border/40 pt-4 space-y-4">
            <h4 className="text-xs font-extrabold uppercase tracking-widest text-zinc-400">
              Operations Center
            </h4>

            {/* Toggle Role / Status controls */}
            <div className="flex gap-2">
              <button
                onClick={handleToggleStatus}
                disabled={updating}
                className={`flex flex-1 min-h-10 items-center justify-center gap-1.5 rounded-lg border text-xs font-bold transition-all disabled:opacity-50 ${
                  user.status === 'suspended'
                    ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-500 hover:bg-emerald-500/10'
                    : 'border-amber-500/20 bg-amber-500/5 text-amber-500 hover:bg-amber-500/10'
                }`}
              >
                {user.status === 'suspended' ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                {user.status === 'suspended' ? 'Activate Account' : 'Suspend Account'}
              </button>

              <button
                onClick={handleToggleRole}
                disabled={updating}
                className="flex flex-1 min-h-10 items-center justify-center gap-1.5 rounded-lg border border-border bg-card text-xs font-bold text-zinc-700 transition-all hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800 disabled:opacity-50"
              >
                <Shield className="h-3.5 w-3.5 text-zinc-400" />
                {user.role === 'admin' ? 'Revoke Admin' : 'Make Admin'}
              </button>
            </div>

            {/* Reset Password form */}
            <form onSubmit={handleResetPassword} className="space-y-2 rounded-lg border border-border/60 p-3.5 bg-zinc-50/20 dark:bg-zinc-900/5">
              <label className="block text-[10px] font-extrabold text-zinc-400 uppercase">
                Reset Account Password
              </label>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="flex-1 rounded-lg border border-border bg-zinc-100 p-2 text-xs font-semibold text-zinc-700 outline-none placeholder:text-zinc-400 focus:border-violet-500 dark:bg-zinc-950/20 dark:text-zinc-300"
                />
                <button
                  type="submit"
                  disabled={updating || !newPassword}
                  className="rounded-lg bg-violet-600 px-3 text-xs font-bold text-white transition-colors hover:bg-violet-700 disabled:opacity-50"
                >
                  Apply
                </button>
              </div>
            </form>

            {/* Verification Link triggers */}
            <button
              onClick={handleSendVerification}
              disabled={updating}
              className="flex w-full min-h-10 items-center justify-center gap-2 rounded-lg border border-border bg-card text-xs font-bold text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800 disabled:opacity-50"
            >
              <Mail className="h-3.5 w-3.5 text-zinc-400" />
              Send Verification Email
            </button>

            {/* Permanent Account Destruction */}
            <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-4 space-y-3">
              <div className="flex items-center gap-2 text-rose-500">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span className="text-[10px] font-extrabold uppercase tracking-wider">Danger Zone</span>
              </div>
              <p className="text-[11px] font-semibold text-rose-500/80">
                Deleting this account is permanent. It destroys all tasks, projects, habits, streaks, and progress.
              </p>
              
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="confirm-delete"
                  checked={confirmDelete}
                  onChange={(e) => setConfirmDelete(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-zinc-300 text-rose-600 focus:ring-rose-500"
                />
                <label htmlFor="confirm-delete" className="text-[10px] font-bold text-zinc-400 cursor-pointer select-none">
                  Confirm permanent deletion
                </label>
              </div>

              <button
                onClick={handleDeleteUser}
                disabled={updating || !confirmDelete}
                className="flex w-full min-h-10 items-center justify-center gap-2 rounded-lg bg-rose-500 text-xs font-bold text-white shadow hover:bg-rose-600 disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Permanently Delete User
              </button>
            </div>
          </div>
        </div>
      </aside>
    </div>
  )
}
