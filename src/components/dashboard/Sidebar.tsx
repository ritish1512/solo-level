'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { useTheme } from '@/components/providers'
import { getUserNotificationsAction } from '@/actions/notificationActions'
import NotificationBell from '@/components/dashboard/NotificationBell'
import {
  LayoutDashboard,
  CheckSquare,
  Flame,
  LogOut,
  Sun,
  Moon,
  User as UserIcon,
  BookOpen,
  Terminal,
  FileText,
  Video,
  Wallet,
  Trophy,
  Bell,
  Menu,
  X,
} from 'lucide-react'

interface UserProfile {
  name: string
  email: string
  image?: string
  xp: number
  level: number
  streak: number
  longestStreak: number
  role: 'user' | 'admin'
}

const links = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Tasks', href: '/dashboard/tasks', icon: CheckSquare },
  { name: 'Habits', href: '/dashboard/habits', icon: Flame },
  { name: 'College', href: '/dashboard/college', icon: BookOpen },
  { name: 'Projects', href: '/dashboard/projects', icon: Terminal },
  { name: 'Notes', href: '/dashboard/notes', icon: FileText },
  { name: 'Creator Hub', href: '/dashboard/content', icon: Video },
  { name: 'Finance', href: '/dashboard/finance', icon: Wallet },
  { name: 'Notifications', href: '/dashboard/notifications', icon: Bell },
  { name: 'Leaderboard', href: '/dashboard/leaderboard', icon: Trophy },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { theme, toggleTheme } = useTheme()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0)

  useEffect(() => {
    async function fetchNotifications() {
      try {
        const notifications = await getUserNotificationsAction()
        setUnreadNotificationsCount(notifications.filter((n) => !n.isRead).length)
      } catch (err) {
        console.error('Failed to fetch unread notification count in sidebar', err)
      }
    }
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [pathname])

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch('/api/user/profile')
        if (res.ok) {
          const data = await res.json()
          setProfile(data)
        }
      } catch (err) {
        console.error('Failed to load user profile in sidebar', err)
      } finally {
        setLoading(false)
      }
    }
    fetchProfile()
  }, [pathname])

  const handleLogout = () => {
    signOut({ callbackUrl: '/' })
  }

  const xpInCurrentLevel = profile ? profile.xp % 100 : 0
  const xpPercentage = profile ? xpInCurrentLevel : 0

  const sidebarContent = (
    <>
      <div className="border-b border-border/40 p-6">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-lg font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-indigo-300"
        >
          <span>SOLO LEVELING</span>
        </Link>
        <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
          Productivity System
        </p>
      </div>

      <nav className="flex-1 space-y-1.5 overflow-y-auto px-4 py-6" aria-label="Dashboard navigation">
        {links.map((link) => {
          const Icon = link.icon
          const isActive = pathname === link.href

          return (
            <Link
              key={link.name}
              href={link.href}
              prefetch={
                link.href === '/dashboard/tasks' || link.href === '/dashboard/projects' || link.href === '/dashboard/content'
                  ? false
                  : true
              }
              onClick={() => setMobileOpen(false)}
              aria-current={isActive ? 'page' : undefined}
              className={`flex min-h-11 items-center gap-3 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all ${
                isActive
                  ? 'border-indigo-500/20 bg-indigo-500/10 text-indigo-500 shadow-sm'
                  : 'border-transparent text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-200'
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="truncate flex-1">{link.name}</span>
              {link.name === 'Notifications' && unreadNotificationsCount > 0 && (
                <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                  {unreadNotificationsCount}
                </span>
              )}
            </Link>
          )
        })}

      </nav>

      <div className="border-t border-border/40 bg-zinc-50/50 px-6 py-4 dark:bg-zinc-900/20">
        {loading ? (
          <div className="animate-pulse space-y-2" aria-label="Loading profile">
            <div className="h-4 w-2/3 rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-3 w-1/2 rounded bg-zinc-200 dark:bg-zinc-800" />
          </div>
        ) : profile ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className="flex items-center justify-center rounded-full bg-indigo-500 px-2 py-0.5 text-xs font-extrabold text-white shadow-sm">
                  Lvl {profile.level}
                </span>
                <span className="truncate text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                  {profile.name.split(' ')[0]}
                </span>
              </div>
              <div className="flex items-center gap-1 text-[11px] font-bold text-amber-500">
                <Flame className="h-3.5 w-3.5 fill-current" />
                <span>{profile.streak} Days</span>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-bold text-zinc-400">
                <span>XP</span>
                <span>{xpInCurrentLevel} / 100</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-300 transition-all duration-500 ease-out"
                  style={{ width: `${xpPercentage}%` }}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <UserIcon className="h-4 w-4" />
            Profile unavailable
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-border/40 p-4">
        <button
          onClick={toggleTheme}
          className="min-h-11 min-w-11 rounded-lg p-2 text-zinc-500 transition-colors hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>

        <button
          onClick={handleLogout}
          className="ml-auto flex min-h-11 items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-rose-500 transition-colors hover:bg-rose-500/10"
          aria-label="Sign out"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </>
  )

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between border-b border-border/60 bg-background/90 px-4 backdrop-blur-md md:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="min-h-11 min-w-11 rounded-lg border border-border text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          aria-controls="mobile-dashboard-navigation"
          aria-expanded={mobileOpen}
          aria-label="Open navigation menu"
        >
          <Menu className="mx-auto h-5 w-5" />
        </button>

        <Link href="/dashboard" className="font-bold tracking-tight text-indigo-500">
          SOLO LEVELING
        </Link>

        <div className="flex items-center gap-2">
          <NotificationBell className="border-none bg-transparent shadow-none p-1" />
          <button
            onClick={toggleTheme}
            className="min-h-11 min-w-11 rounded-lg border border-border text-zinc-500 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="mx-auto h-5 w-5" /> : <Moon className="mx-auto h-5 w-5" />}
          </button>
        </div>
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-label="Dashboard navigation" aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation menu"
          />
          <aside
            id="mobile-dashboard-navigation"
            className="relative flex h-dvh w-[min(20rem,calc(100vw-2rem))] flex-col justify-between border-r border-border bg-card/95 shadow-2xl"
          >
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-3 z-10 min-h-11 min-w-11 rounded-lg text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
              aria-label="Close navigation menu"
            >
              <X className="mx-auto h-5 w-5" />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}

      <aside className="sticky top-0 z-20 hidden h-screen w-64 shrink-0 flex-col justify-between border-r border-border bg-card/40 backdrop-blur-md md:flex">
        {sidebarContent}
      </aside>
    </>
  )
}
