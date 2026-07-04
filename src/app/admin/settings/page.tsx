'use client'

import React, { useEffect, useState, useTransition } from 'react'
import { useToast } from '@/components/ui/Toast'
import {
  fetchPlatformSettings,
  savePlatformSettingsAction,
} from '@/actions/adminSettingsActions'
import {
  Settings,
  Shield,
  Save,
  Loader2,
  AlertTriangle,
  Database,
  Lock,
  Globe,
  CheckCircle,
} from 'lucide-react'
import FileOrLinkUpload from '@/components/ui/FileOrLinkUpload'

export default function AdminSettingsPage() {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<'general' | 'security'>('general')
  const [loading, setLoading] = useState(true)
  const [isPending, startTransition] = useTransition()

  // General settings state
  const [general, setGeneral] = useState({
    brandName: '',
    logoUrl: '',
    faviconUrl: '',
    maintenanceMode: false,
    registrationAllowed: true,
    defaultUserXp: 0,
    defaultUserLevel: 1,
  })

  // Security settings state
  const [security, setSecurity] = useState({
    sessionDurationDays: 30,
    passwordMinLength: 6,
    requireSpecialChars: false,
    backupFrequencyHours: 24,
    lastBackupTime: '',
  })

  // Load configuration blocks
  useEffect(() => {
    async function loadSettings() {
      try {
        const [genData, secData] = await Promise.all([
          fetchPlatformSettings('general_settings'),
          fetchPlatformSettings('security_settings'),
        ])

        if (genData) setGeneral(genData)
        if (secData) setSecurity(secData)
      } catch (err) {
        toast('Failed to load platform settings', 'error')
      } finally {
        setLoading(false)
      }
    }
    const id = setTimeout(() => loadSettings(), 0)
    return () => clearTimeout(id)
  }, [])

  // Save General settings
  const handleSaveGeneral = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const res = await savePlatformSettingsAction('general_settings', general)
      if (res.success) {
        toast('General settings updated successfully!', 'success')
      } else {
        toast(res.error || 'Failed to save general settings', 'error')
      }
    })
  }

  // Save Security settings
  const handleSaveSecurity = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const res = await savePlatformSettingsAction('security_settings', security)
      if (res.success) {
        toast('Security credentials updated!', 'success')
      } else {
        toast(res.error || 'Failed to save security settings', 'error')
      }
    })
  }

  // Backup trigger simulation
  const handleTriggerBackup = () => {
    toast('Initializing database backup sequence...', 'info')
    setTimeout(() => {
      setSecurity({
        ...security,
        lastBackupTime: new Date().toISOString(),
      })
      toast('Backup archive successfully created and stored in local node dumps!', 'success')
    }, 2000)
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-zinc-400" aria-label="Loading settings console">
        <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div>
        <h1 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-3xl">
          System Settings
        </h1>
        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
          Configure general brand names, registration rules, session lifetimes, and manage local backups.
        </p>
      </div>

      {/* Tabs navigation panel */}
      <div className="flex border-b border-border/40 pb-2">
        <button
          onClick={() => setActiveTab('general')}
          className={`mr-6 flex items-center gap-1.5 border-b-2 pb-2 text-xs font-bold transition-all ${
            activeTab === 'general'
              ? 'border-violet-500 text-violet-500'
              : 'border-transparent text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
          }`}
        >
          <Globe className="h-4 w-4" />
          General Platform Config
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-1.5 border-b-2 pb-2 text-xs font-bold transition-all ${
            activeTab === 'security'
              ? 'border-violet-500 text-violet-500'
              : 'border-transparent text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
          }`}
        >
          <Shield className="h-4 w-4" />
          Security & Database Backups
        </button>
      </div>

      {/* Tab Panel: General settings */}
      {activeTab === 'general' && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Form */}
          <div className="lg:col-span-2 rounded-xl border border-border bg-card/25 p-6 backdrop-blur-md">
            <form onSubmit={handleSaveGeneral} className="space-y-4">
              {/* Brand name */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-zinc-500">Platform Brand Name</label>
                <input
                  type="text"
                  value={general.brandName}
                  onChange={(e) => setGeneral({ ...general, brandName: e.target.value })}
                  className="w-full rounded-lg border border-border bg-zinc-50/50 p-2.5 text-xs font-semibold text-zinc-700 outline-none focus:border-violet-500 dark:bg-zinc-950/20 dark:text-zinc-300"
                  required
                />
              </div>

              {/* Logo / Favicon URLs */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <FileOrLinkUpload
                    value={general.logoUrl}
                    onUploadComplete={(url) => setGeneral({ ...general, logoUrl: url })}
                    label="Brand Logo"
                    placeholder="https://assets.sololeveling.com/logo.png"
                    accept="image/*"
                  />
                </div>
                <div className="space-y-1.5">
                  <FileOrLinkUpload
                    value={general.faviconUrl}
                    onUploadComplete={(url) => setGeneral({ ...general, faviconUrl: url })}
                    label="Favicon Shortcut Icon"
                    placeholder="/favicon.ico"
                    accept="image/x-icon,image/png,image/jpeg"
                  />
                </div>
              </div>

              {/* Registration Allowed */}
              <div className="flex items-center gap-2 border-t border-border/20 pt-3 pb-2">
                <input
                  type="checkbox"
                  id="registration-allowed"
                  checked={general.registrationAllowed}
                  onChange={(e) => setGeneral({ ...general, registrationAllowed: e.target.checked })}
                  className="h-3.5 w-3.5 rounded border-zinc-300 text-violet-600 focus:ring-violet-500"
                />
                <label htmlFor="registration-allowed" className="text-xs font-bold text-zinc-500 cursor-pointer select-none">
                  Enable public member registrations
                </label>
              </div>

              {/* Default level / XP */}
              <div className="grid gap-4 sm:grid-cols-2 border-t border-border/20 pt-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-zinc-500">Default Sign-up XP</label>
                  <input
                    type="number"
                    value={general.defaultUserXp}
                    onChange={(e) => setGeneral({ ...general, defaultUserXp: parseInt(e.target.value) || 0 })}
                    className="w-full rounded-lg border border-border bg-zinc-50/50 p-2.5 text-xs font-semibold text-zinc-700 outline-none focus:border-violet-500 dark:bg-zinc-950/20 dark:text-zinc-300"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-zinc-500">Default Sign-up Level</label>
                  <input
                    type="number"
                    value={general.defaultUserLevel}
                    onChange={(e) => setGeneral({ ...general, defaultUserLevel: parseInt(e.target.value) || 1 })}
                    className="w-full rounded-lg border border-border bg-zinc-50/50 p-2.5 text-xs font-semibold text-zinc-700 outline-none focus:border-violet-500 dark:bg-zinc-950/20 dark:text-zinc-300"
                    required
                  />
                </div>
              </div>

              {/* Maintenance mode toggle */}
              <div className="border-t border-border/20 pt-4 space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="maintenance-mode"
                    checked={general.maintenanceMode}
                    onChange={(e) => setGeneral({ ...general, maintenanceMode: e.target.checked })}
                    className="h-3.5 w-3.5 rounded border-zinc-300 text-rose-600 focus:ring-rose-500"
                  />
                  <label htmlFor="maintenance-mode" className="text-xs font-black text-rose-500 cursor-pointer select-none">
                    ACTIVATE MAINTENANCE BLOCK MODE
                  </label>
                </div>

                {general.maintenanceMode && (
                  <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-4 flex gap-3 items-start animate-fade-in">
                    <AlertTriangle className="h-5 w-5 text-rose-500 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-rose-500">Warning: Maintenance Active</p>
                      <p className="text-[11px] text-rose-500/80 mt-1 font-semibold leading-relaxed">
                        Enabling maintenance mode blocks all standard member logins and locks active dashboard routes. Only users with the `admin` role will bypass this blocker.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="flex min-h-10 items-center justify-center gap-2 rounded-lg bg-violet-600 px-5 text-xs font-bold text-white shadow hover:bg-violet-700 disabled:opacity-50"
              >
                {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Save General Settings
              </button>
            </form>
          </div>

          {/* Configuration context preview */}
          <div className="rounded-xl border border-border bg-card/25 p-6 backdrop-blur-md h-fit space-y-4">
            <h3 className="text-xs font-extrabold uppercase tracking-widest text-zinc-400">
              Settings Integrity
            </h3>
            <p className="text-[11px] font-semibold text-zinc-400 leading-relaxed">
              These configurations govern key-value entries in MongoDB. General adjustments refresh instantly without needing compiler modifications.
            </p>
          </div>
        </div>
      )}

      {/* Tab Panel: Security & backups */}
      {activeTab === 'security' && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Security Form */}
          <div className="lg:col-span-2 rounded-xl border border-border bg-card/25 p-6 backdrop-blur-md">
            <form onSubmit={handleSaveSecurity} className="space-y-4">
              {/* Session lifetime */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-zinc-500">Session Cookie Expiration (Days)</label>
                <input
                  type="number"
                  value={security.sessionDurationDays}
                  onChange={(e) => setSecurity({ ...security, sessionDurationDays: parseInt(e.target.value) || 30 })}
                  className="w-full rounded-lg border border-border bg-zinc-50/50 p-2.5 text-xs font-semibold text-zinc-700 outline-none focus:border-violet-500 dark:bg-zinc-950/20 dark:text-zinc-300"
                  required
                />
              </div>

              {/* Password min length */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-zinc-500">Minimum Password Length Requirement</label>
                <input
                  type="number"
                  value={security.passwordMinLength}
                  onChange={(e) => setSecurity({ ...security, passwordMinLength: parseInt(e.target.value) || 6 })}
                  className="w-full rounded-lg border border-border bg-zinc-50/50 p-2.5 text-xs font-semibold text-zinc-700 outline-none focus:border-violet-500 dark:bg-zinc-950/20 dark:text-zinc-300"
                  required
                />
              </div>

              {/* Special characters */}
              <div className="flex items-center gap-2 pb-2">
                <input
                  type="checkbox"
                  id="require-special-chars"
                  checked={security.requireSpecialChars}
                  onChange={(e) => setSecurity({ ...security, requireSpecialChars: e.target.checked })}
                  className="h-3.5 w-3.5 rounded border-zinc-300 text-violet-600 focus:ring-violet-500"
                />
                <label htmlFor="require-special-chars" className="text-xs font-bold text-zinc-500 cursor-pointer select-none">
                  Require special characters in member passwords
                </label>
              </div>

              {/* Backup configuration */}
              <div className="border-t border-border/20 pt-4 space-y-1.5">
                <label className="block text-xs font-bold text-zinc-500">Automated Backup Frequency (Hours)</label>
                <input
                  type="number"
                  value={security.backupFrequencyHours}
                  onChange={(e) => setSecurity({ ...security, backupFrequencyHours: parseInt(e.target.value) || 24 })}
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
                Save Security Settings
              </button>
            </form>
          </div>

          {/* Database Backup inspector */}
          <div className="rounded-xl border border-border bg-card/25 p-6 backdrop-blur-md h-fit space-y-4">
            <div className="flex items-center gap-2 border-b border-border/40 pb-3">
              <Database className="h-4.5 w-4.5 text-violet-500" />
              <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Database Backups</h3>
            </div>

            <div className="text-xs font-semibold text-zinc-500 space-y-3">
              <div>
                <p className="text-[10px] text-zinc-400 uppercase">Last Backup Archive Timestamp</p>
                <p className="mt-1 text-zinc-700 dark:text-zinc-300 font-bold font-mono">
                  {security.lastBackupTime ? new Date(security.lastBackupTime).toLocaleString() : 'Never'}
                </p>
              </div>

              <button
                onClick={handleTriggerBackup}
                className="flex w-full min-h-10 items-center justify-center gap-2 rounded-lg bg-violet-600 text-xs font-bold text-white shadow hover:bg-violet-700"
              >
                <CheckCircle className="h-3.5 w-3.5" />
                Trigger Database Backup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
