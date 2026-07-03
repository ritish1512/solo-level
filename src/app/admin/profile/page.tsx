'use client'

import React, { useEffect, useState, useTransition } from 'react'
import { useToast } from '@/components/ui/Toast'
import {
  fetchAdminProfileDetails,
  updateAdminProfileDetailsAction,
  updateAdminPasswordAction,
  fetchAdminPersonalHistory,
  AdminActivityItem,
} from '@/actions/adminProfileActions'
import {
  User,
  Shield,
  Save,
  Loader2,
  Lock,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  Key,
} from 'lucide-react'
import FileOrLinkUpload from '@/components/ui/FileOrLinkUpload'

export default function AdminProfilePage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [isPending, startTransition] = useTransition()

  // Profile data states
  const [profile, setProfile] = useState({
    id: '',
    name: '',
    email: '',
    image: '',
    role: '',
    createdAt: '',
  })

  // Password state
  const [pwd, setPwd] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })

  // Action history state
  const [history, setHistory] = useState<AdminActivityItem[]>([])

  // Load details
  const loadProfile = async () => {
    try {
      const [details, logs] = await Promise.all([
        fetchAdminProfileDetails(),
        fetchAdminPersonalHistory(),
      ])

      setProfile(details)
      setHistory(logs)
    } catch (err) {
      toast('Failed to load profile details', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProfile()
  }, [])

  // Save profile details
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const res = await updateAdminProfileDetailsAction({
        name: profile.name,
        email: profile.email,
        image: profile.image,
      })
      if (res.success) {
        toast('Profile updated successfully!', 'success')
        loadProfile()
      } else {
        toast(res.error || 'Failed to update profile', 'error')
      }
    })
  }

  // Save password
  const handleSavePassword = (e: React.FormEvent) => {
    e.preventDefault()
    if (pwd.newPassword !== pwd.confirmPassword) {
      toast('Passwords do not match', 'error')
      return
    }

    startTransition(async () => {
      const res = await updateAdminPasswordAction({
        currentPassword: pwd.currentPassword,
        newPassword: pwd.newPassword,
      })
      if (res.success) {
        toast('Password updated successfully!', 'success')
        setPwd({ currentPassword: '', newPassword: '', confirmPassword: '' })
        loadProfile()
      } else {
        toast(res.error || 'Failed to update password', 'error')
      }
    })
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-zinc-400" aria-label="Loading profile page">
        <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div>
        <h1 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-3xl">
          Profile Settings
        </h1>
        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
          Manage your personal console avatar, login credentials, and inspect activity logs.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Profile Card */}
        <div className="rounded-xl border border-border bg-card/25 p-6 backdrop-blur-md h-fit space-y-6">
          <div className="flex items-center gap-2 border-b border-border/40 pb-3">
            <User className="h-4.5 w-4.5 text-violet-500" />
            <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Personal Information</h3>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            {/* Avatar section */}
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-violet-500/10 text-violet-500 font-extrabold ring-2 ring-violet-500/20">
                {profile.image ? (
                  <img src={profile.image} alt={profile.name} className="h-full w-full rounded-full object-cover" />
                ) : (
                  <User className="h-8 w-8" />
                )}
              </div>
              <div className="space-y-1 flex-1">
                <label className="block text-[10px] font-extrabold text-zinc-400 uppercase font-bold text-zinc-500">Avatar Image</label>
                <FileOrLinkUpload
                  value={profile.image}
                  onUploadComplete={(url) => setProfile({ ...profile, image: url })}
                  placeholder="https://assets.sololeveling.com/avatar.png"
                  accept="image/*"
                />
              </div>
            </div>

            {/* Name */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-zinc-500">Name</label>
              <input
                type="text"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                className="w-full rounded-lg border border-border bg-zinc-50/50 p-2.5 text-xs font-semibold text-zinc-700 outline-none focus:border-violet-500 dark:bg-zinc-950/20 dark:text-zinc-300"
                required
              />
            </div>

            {/* Email */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-zinc-500">Email Address</label>
              <input
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                className="w-full rounded-lg border border-border bg-zinc-50/50 p-2.5 text-xs font-semibold text-zinc-700 outline-none focus:border-violet-500 dark:bg-zinc-950/20 dark:text-zinc-300"
                required
              />
            </div>

            {/* Role / Joined details */}
            <div className="grid gap-4 grid-cols-2 pt-2 text-[11px] font-bold text-zinc-400">
              <div>
                <p className="text-[10px] text-zinc-400 uppercase">Account Role</p>
                <p className="mt-1 text-rose-500 flex items-center gap-1.5">
                  <Shield className="h-4 w-4" />
                  {profile.role}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-zinc-400 uppercase">Joined Platform</p>
                <p className="mt-1 text-zinc-700 dark:text-zinc-300">
                  {new Date(profile.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="flex min-h-10 items-center justify-center gap-2 rounded-lg bg-violet-600 px-5 text-xs font-bold text-white shadow hover:bg-violet-700 disabled:opacity-50"
            >
              {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Save Profile Details
            </button>
          </form>
        </div>

        {/* Change Password Card */}
        <div className="rounded-xl border border-border bg-card/25 p-6 backdrop-blur-md h-fit space-y-6">
          <div className="flex items-center gap-2 border-b border-border/40 pb-3">
            <Key className="h-4.5 w-4.5 text-violet-500" />
            <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Change Password</h3>
          </div>

          <form onSubmit={handleSavePassword} className="space-y-4">
            {/* Current Password */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-zinc-500">Current Password</label>
              <input
                type="password"
                value={pwd.currentPassword}
                onChange={(e) => setPwd({ ...pwd, currentPassword: e.target.value })}
                placeholder="Enter current password"
                className="w-full rounded-lg border border-border bg-zinc-50/50 p-2.5 text-xs font-semibold text-zinc-700 outline-none focus:border-violet-500 dark:bg-zinc-950/20 dark:text-zinc-300"
                required
              />
            </div>

            {/* New Password */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-zinc-500">New Password</label>
              <input
                type="password"
                value={pwd.newPassword}
                onChange={(e) => setPwd({ ...pwd, newPassword: e.target.value })}
                placeholder="Enter new password"
                className="w-full rounded-lg border border-border bg-zinc-50/50 p-2.5 text-xs font-semibold text-zinc-700 outline-none focus:border-violet-500 dark:bg-zinc-950/20 dark:text-zinc-300"
                required
              />
            </div>

            {/* Confirm New Password */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-zinc-500">Confirm New Password</label>
              <input
                type="password"
                value={pwd.confirmPassword}
                onChange={(e) => setPwd({ ...pwd, confirmPassword: e.target.value })}
                placeholder="Re-enter new password"
                className="w-full rounded-lg border border-border bg-zinc-50/50 p-2.5 text-xs font-semibold text-zinc-700 outline-none focus:border-violet-500 dark:bg-zinc-950/20 dark:text-zinc-300"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="flex min-h-10 items-center justify-center gap-2 rounded-lg bg-violet-600 px-5 text-xs font-bold text-white shadow hover:bg-violet-700 disabled:opacity-50"
            >
              {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Update Account Password
            </button>
          </form>
        </div>

        {/* Admin Personal logs */}
        <div className="rounded-xl border border-border bg-card/25 p-6 backdrop-blur-md md:col-span-2 space-y-4">
          <div className="flex items-center gap-2 border-b border-border/40 pb-3">
            <Clock className="h-4.5 w-4.5 text-violet-500" />
            <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Your Action Audits (Personal history)</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-semibold text-zinc-500">
              <thead>
                <tr className="border-b border-border/40 text-[10px] uppercase text-zinc-400">
                  <th className="py-2">Time</th>
                  <th className="py-2">Action</th>
                  <th className="py-2">Details</th>
                  <th className="py-2 text-center">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20 font-medium">
                {history.map((log) => (
                  <tr key={log.id} className="hover:bg-zinc-50/10 dark:hover:bg-zinc-800/10">
                    <td className="py-2.5 text-zinc-400">{new Date(log.timestamp).toLocaleString()}</td>
                    <td className="py-2.5">
                      <span className="font-mono text-[10px] font-bold text-violet-500 uppercase tracking-wide">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-2.5">{log.details || 'No details recorded'}</td>
                    <td className="py-2.5 text-center">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[9px] font-extrabold uppercase ${
                          log.result === 'Success'
                            ? 'bg-emerald-500/10 text-emerald-500'
                            : 'bg-rose-500/10 text-rose-500'
                        }`}
                      >
                        {log.result}
                      </span>
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
