'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { useTheme } from '@/components/providers'
import {
  LayoutDashboard,
  Users,
  BarChart3,
  Briefcase,
  CheckSquare,
  FileText,
  Image as ImageIcon,
  Mail,
  Bell,
  HelpCircle,
  History,
  Database,
  Activity,
  Settings,
  User as UserIcon,
  Sun,
  Moon,
  LogOut,
  Menu,
  X,
  Shield,
} from 'lucide-react'

interface UserProfile {
  name: string
  email: string
  image?: string
  role: 'user' | 'admin'
}

const adminLinks = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Users', href: '/admin/users', icon: Users },
  { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
  { name: 'Projects', href: '/admin/projects', icon: Briefcase },
  { name: 'Tasks', href: '/admin/tasks', icon: CheckSquare },
  { name: 'Content', href: '/admin/content', icon: FileText },
  { name: 'Media', href: '/admin/media', icon: ImageIcon },
  { name: 'Emails', href: '/admin/emails', icon: Mail },
  { name: 'Notifications', href: '/admin/notifications', icon: Bell },
  { name: 'Support', href: '/admin/support', icon: HelpCircle },
  { name: 'Audit Logs', href: '/admin/audit-logs', icon: History },
  { name: 'CMS', href: '/admin/cms', icon: Database },
  { name: 'System', href: '/admin/system', icon: Activity },
  { name: 'Settings', href: '/admin/settings', icon: Settings },
  { name: 'Profile', href: '/admin/profile', icon: UserIcon },
]

export default function AdminSidebar() {
  const pathname = usePathname()
  const { theme, toggleTheme } = useTheme()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch('/api/user/profile')
        if (res.ok) {
          const data = await res.json()
          setProfile(data)
        }
      } catch (err) {
        console.error('Failed to load user profile in admin sidebar', err)
      } finally {
        setLoading(false)
      }
    }
    fetchProfile()
  }, [pathname])

  const handleLogout = () => {
    signOut({ callbackUrl: '/' })
  }

  const sidebarContent = (
    <>
      {/* Sidebar Header */}
      <div className="border-b border-border/40 p-6">
        <Link
          href="/admin"
          className="flex items-center gap-2 text-lg font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-violet-500 to-fuchsia-400"
        >
          <Shield className="h-5 w-5 shrink-0 text-violet-500" />
          <span>SOLO LEVELING</span>
        </Link>
        <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-violet-400/80">
          Admin Console
        </p>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-4 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent" aria-label="Admin console navigation">
        {adminLinks.map((link) => {
          const Icon = link.icon
          // Handle active states correctly. /admin is active exactly. /admin/users is active when starting with it.
          const isActive =
            link.href === '/admin'
              ? pathname === '/admin'
              : pathname.startsWith(link.href)

          return (
            <Link
              key={link.name}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              aria-current={isActive ? 'page' : undefined}
              className={`group flex min-h-10 items-center gap-3 rounded-lg border px-3 py-2 text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'border-violet-500/20 bg-violet-500/10 text-violet-500 shadow-sm dark:bg-violet-500/15'
                  : 'border-transparent text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/40 dark:hover:text-zinc-200'
              }`}
            >
              <Icon className={`h-4.5 w-4.5 shrink-0 transition-transform group-hover:scale-105 ${
                isActive ? 'text-violet-500' : 'text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300'
              }`} />
              <span className="truncate">{link.name}</span>
            </Link>
          )
        })}
      </nav>

      {/* Profile Bar */}
      <div className="border-t border-border/40 bg-zinc-50/50 px-6 py-4 dark:bg-zinc-900/10">
        {loading ? (
          <div className="animate-pulse space-y-2" aria-label="Loading admin profile">
            <div className="h-4 w-2/3 rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-3 w-1/2 rounded bg-zinc-200 dark:bg-zinc-800" />
          </div>
        ) : profile ? (
          <div className="flex items-center gap-3 min-w-0">
            {profile.image ? (
              <img
                src={profile.image}
                alt={profile.name}
                className="h-9 w-9 rounded-full object-cover ring-2 ring-violet-500/20"
              />
            ) : (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-500/10 text-violet-500 ring-2 ring-violet-500/20">
                <UserIcon className="h-4 w-4" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-zinc-800 dark:text-zinc-200">
                {profile.name}
              </p>
              <p className="truncate text-[10px] font-semibold text-zinc-400 dark:text-zinc-500">
                {profile.email}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <Shield className="h-4 w-4" />
            Console Secure
          </div>
        )}
      </div>

      {/* Footer Controls */}
      <div className="flex items-center justify-between gap-2 border-t border-border/40 p-4 bg-zinc-50/50 dark:bg-zinc-900/10">
        <button
          onClick={toggleTheme}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-border/40 text-zinc-500 transition-colors hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
        </button>

        <button
          onClick={handleLogout}
          className="ml-auto flex min-h-10 items-center gap-2 rounded-lg border border-transparent px-3 py-2 text-xs font-semibold text-rose-500 transition-all hover:bg-rose-500/10"
          aria-label="Sign out"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign Out
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile Top Header */}
      <header className="fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between border-b border-border/60 bg-background/90 px-4 backdrop-blur-md md:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-border/60 text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          aria-controls="mobile-admin-navigation"
          aria-expanded={mobileOpen}
          aria-label="Open administration menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <Link href="/admin" className="flex items-center gap-2 font-bold tracking-tight text-violet-500">
          <Shield className="h-4 w-4" />
          <span>SOLO LEVELING ADMIN</span>
        </Link>

        <button
          onClick={toggleTheme}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-border/60 text-zinc-500 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
        </button>
      </header>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden animate-fade-in" role="dialog" aria-label="Admin console navigation" aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileOpen(false)}
            aria-label="Close admin menu"
          />
          <aside
            id="mobile-admin-navigation"
            className="relative flex h-dvh w-[min(18rem,calc(100vw-3rem))] flex-col justify-between border-r border-border bg-card shadow-2xl transition-transform duration-300"
          >
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
              aria-label="Close admin menu"
            >
              <X className="h-5 w-5" />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Desktop Persistent Sidebar */}
      <aside className="sticky top-0 z-20 hidden h-screen w-60 shrink-0 flex-col justify-between border-r border-border bg-card/30 backdrop-blur-md md:flex">
        {sidebarContent}
      </aside>
    </>
  )
}
