import type { Metadata } from 'next'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { Button } from '@/components/ui/Button'
import { ThemeToggleButton } from '@/components/ThemeToggleButton'
import { ArrowRight, Shield, Award, Calendar, Zap, LayoutDashboard, Brain } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Productivity Dashboard for High Achievers',
  description:
    'Solo Leveling is a productivity dashboard for tasks, habits, projects, notes, college planning, finance tracking, and focused daily execution.',
  alternates: {
    canonical: '/',
  },
}

const features = [
  {
    icon: <LayoutDashboard className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />,
    title: 'Dynamic Dashboard',
    description: 'Quick-add items, daily completion score, time blocks, and progress metrics at a glance.',
  },
  {
    icon: <Zap className="h-5 w-5 text-amber-600 dark:text-amber-500" />,
    title: 'Smart Task Manager',
    description: 'Filter tasks by difficulty, energy levels, priorities, categories, and track actual vs estimated time.',
  },
  {
    icon: <Award className="h-5 w-5 text-emerald-600 dark:text-emerald-500" />,
    title: 'Gamification System',
    description: 'Earn XP, level up, unlock achievements, and maintain habit streaks with visual reward cues.',
  },
  {
    icon: <Calendar className="h-5 w-5 text-rose-600 dark:text-rose-500" />,
    title: 'College & Projects',
    description: 'Manage assignments, check attendance metrics, track bugs, and organize project repositories.',
  },
  {
    icon: <Brain className="h-5 w-5 text-purple-600 dark:text-purple-500" />,
    title: 'AI Productivity Coach',
    description: 'Analyze unfinished tasks, schedule priorities, detect procrastination patterns, and get reports.',
  },
  {
    icon: <Shield className="h-5 w-5 text-sky-600 dark:text-sky-500" />,
    title: 'Secured Client Portal',
    description: 'Track invoices, log budgets, monitor savings, and process secure Razorpay payment structures.',
  },
]

export default async function LandingPage() {
  const session = await auth()
  const isAuthenticated = Boolean(session?.user)
  const dashboardHref = '/dashboard'
  const primaryCtaHref = isAuthenticated ? dashboardHref : '/register'
  const secondaryCtaHref = isAuthenticated ? dashboardHref : '/login'

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-between overflow-x-hidden bg-slate-50/50 transition-colors duration-300 dark:bg-background">
      {/* Enhanced contrast background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0000000f_1px,transparent_1px),linear-gradient(to_bottom,#0000000f_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

      {/* Header */}
      <header className="z-10 mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-2 text-lg font-bold tracking-tight sm:text-xl">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-zinc-950 via-zinc-800 to-zinc-700 dark:from-zinc-50 dark:to-zinc-400">
            SOLO LEVELING
          </span>
          <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-indigo-600/10 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-600/20 dark:border-indigo-500/20 rounded">
            v1.0
          </span>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <ThemeToggleButton />
          {isAuthenticated ? (
            <Link href={dashboardHref}>
              <Button variant="primary" size="sm">Dashboard</Button>
            </Link>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm" className="hidden text-zinc-700 dark:text-zinc-200 min-[390px]:inline-flex">Sign In</Button>
              </Link>
              <Link href="/register">
                <Button variant="primary" size="sm">Get Started</Button>
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <main id="main-content" className="z-10 mx-auto flex max-w-5xl flex-1 flex-col items-center justify-center px-4 py-12 text-center sm:px-6 sm:py-16">
        <div className="flex animate-[fade-in-up_600ms_ease-out] flex-col items-center">
          {/* Enhanced contrast badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-border shadow-sm mb-6 animate-pulse text-zinc-800 dark:text-zinc-200">
            <span className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-500" />
            <span>Optimize Your Daily Execution</span>
          </div>

          <h1 className="mb-6 max-w-3xl bg-gradient-to-b from-zinc-950 via-zinc-800 to-zinc-700 bg-clip-text text-[clamp(2.25rem,8vw,4rem)] font-extrabold leading-[1.12] text-transparent dark:from-white dark:via-zinc-200 dark:to-zinc-500">
            The Ultimate Second Brain for High Achievers.
          </h1>

          <p className="mb-10 max-w-2xl text-[clamp(1rem,2.4vw,1.25rem)] font-medium leading-relaxed text-zinc-600 [text-shadow:_0_1px_0_rgb(255_255_255_/_40%)] dark:text-zinc-400 dark:[text-shadow:none]">
            Eliminate mental clutter and increase velocity. Track daily habits, manage projects, calculate CGPA, catalog client invoices, and level up your skills with a built-in AI productivity coach.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4 justify-center">
            <Link href={primaryCtaHref}>
              <Button variant="primary" size="lg" className="w-full sm:w-auto gap-2 shadow-md shadow-indigo-600/10 dark:shadow-none">
                {isAuthenticated ? 'Continue to Dashboard' : 'Level Up Now'} <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href={secondaryCtaHref}>
              <Button variant="outline" size="lg" className="w-full sm:w-auto bg-white hover:bg-zinc-50 text-zinc-800 border-zinc-200 dark:bg-transparent dark:text-zinc-200 dark:border-border">
                {isAuthenticated ? 'Open Dashboard' : 'Access Dashboard'}
              </Button>
            </Link>
          </div>
        </div>

        {/* Features grid */}
        <section className="mt-16 grid w-full animate-[fade-in-up_800ms_ease-out_160ms_both] grid-cols-1 gap-4 text-left sm:grid-cols-2 lg:mt-24 lg:grid-cols-3 lg:gap-6">
          {features.map((f, i) => (
            <div 
              key={i} 
              className="rounded-xl border border-zinc-200/80 bg-white p-5 transition-all hover:border-zinc-300 hover:bg-zinc-50 hover:shadow-md dark:border-border dark:bg-card/30 dark:hover:border-zinc-700 dark:hover:bg-card/70 sm:p-6"
            >
              <div className="p-2.5 bg-zinc-100/80 dark:bg-zinc-900 rounded-lg w-fit border border-zinc-200 dark:border-border mb-4">
                {f.icon}
              </div>
              <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-50 mb-2">
                {f.title}
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed font-medium">
                {f.description}
              </p>
            </div>
          ))}
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-zinc-200 dark:border-border/40 py-6 text-center text-xs text-zinc-600 dark:text-zinc-600 z-10 bg-white/80 dark:bg-background/50 backdrop-blur-sm">
        <p>&copy; {new Date().getFullYear()} Solo Leveling Productivity System. Built for absolute focus.</p>
      </footer>
    </div>
  )
}
