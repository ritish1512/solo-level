'use client'

import React, { useState, useTransition, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  Star,
  Download,
  Check,
  Plus,
  Trash2,
  BookOpen,
  Terminal,
  FileText,
  Video,
  Wallet,
  X,
  Sparkles,
  TrendingUp,
  Award,
  Layers,
  Info,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { installFeatureAction, uninstallFeatureAction } from '@/actions/featureActions'

interface FeatureShopClientProps {
  initialInstalledFeatures: string[]
}

interface FeatureItem {
  id: string
  name: string
  shortDescription: string
  description: string
  icon: any
  iconName: string
  category: 'Productivity' | 'Education' | 'Utilities' | 'Social' | 'Finance'
  rating: number
  reviews: string
  downloads: string
  downloadsCount: number
  size: string
  version: string
  releaseDate: string
  developer: string
  whatsNew: string
  featuresList: string[]
  gradient: string
}

const FEATURES_DATA: FeatureItem[] = [
  {
    id: 'projects',
    name: 'Shadow Projects',
    shortDescription: 'Summon software projects, track issues, and manage bug raiders.',
    description: 'Unlock the project workspace module and marshal your codebase like a Monarch commanding shadow soldiers. Design boards, log bug checkpoints, assign task priority levels, and clear milestones. Keep projects synchronized and track dev raider status indicators.',
    icon: Terminal,
    iconName: 'Terminal',
    category: 'Productivity',
    rating: 4.9,
    reviews: '4.8k reviews',
    downloads: '125k+ installs',
    downloadsCount: 125000,
    size: '8.2 MB',
    version: 'v1.5.0',
    releaseDate: 'July 2026',
    developer: 'Monarch Dev Studio',
    whatsNew: 'Revamped bug priority tags with glowing borders. Introduced drag-and-drop board cards for easier kanban sorting.',
    featuresList: [
      'Visual projects checklist board with cards',
      'Unified issue tracker with severity level badges (Low, Medium, High, Critical)',
      'Milestone progress bars and code repository linkages',
      'Optimistic state updates for instant rendering',
    ],
    gradient: 'from-purple-600 to-indigo-600',
  },
  {
    id: 'finance',
    name: 'Monarch Wallet',
    shortDescription: 'Track raid expenses, manage budgets, and balance gold coins.',
    description: 'Track gold transactions, set monthly dungeon-raid budgets, and analyze expense categories. Level up your finance stats with clean balance cards, log transaction histories, and receive real-time warning indicators when raid budgets exceed safe margins.',
    icon: Wallet,
    iconName: 'Wallet',
    category: 'Finance',
    rating: 4.9,
    reviews: '3.9k reviews',
    downloads: '110k+ installs',
    downloadsCount: 110000,
    size: '6.4 MB',
    version: 'v2.1.2',
    releaseDate: 'June 2026',
    developer: 'Gate Finance Syndicate',
    whatsNew: 'Added recurring transaction scheduling. Designed new high-contrast charts for expense analytics.',
    featuresList: [
      'Income & Expense ledger with transaction timestamps',
      'Custom budget categories with live depletion meters',
      'Dynamic calculations showing net savings and balance cards',
      'Full search across logs and tag filters',
    ],
    gradient: 'from-amber-600 to-yellow-500',
  },
  {
    id: 'notes',
    name: 'Monarch Notes',
    shortDescription: 'A markdown notebook for cataloging dungeon secrets and code scripts.',
    description: 'Write, pin, and organize logs in a markdown-friendly notepad. Perfect for code snippets, daily logs, raid debriefs, and planning. Quick search allows you to locate text in seconds, while custom colored tags let you organize scrolls cleanly.',
    icon: FileText,
    iconName: 'FileText',
    category: 'Utilities',
    rating: 4.7,
    reviews: '5.2k reviews',
    downloads: '95k+ installs',
    downloadsCount: 95000,
    size: '3.1 MB',
    version: 'v1.2.4',
    releaseDate: 'May 2026',
    developer: 'Librarian Association',
    whatsNew: 'Performance enhancement in markdown parser rendering. Enabled quick note copy shortcuts.',
    featuresList: [
      'Markdown text styling, list items, and code highlights',
      'Tag manager with custom color label bindings',
      'Pin critical notes to the top of your list',
      'Archive panel to hide old documents without deletion',
    ],
    gradient: 'from-teal-600 to-emerald-600',
  },
  {
    id: 'college',
    name: 'College Academy',
    shortDescription: 'Coordinate classes, monitor assignments, and track exam raids.',
    description: 'Unlock the academic gateway to track subjects, semesters, and credits. Maintain high grades by logging assignment dates and exam timers. A dungeon raid calculator helps you predict weights, credits, and target grades to level up your academic ranking.',
    icon: BookOpen,
    iconName: 'BookOpen',
    category: 'Education',
    rating: 4.8,
    reviews: '2.1k reviews',
    downloads: '45k+ installs',
    downloadsCount: 45000,
    size: '4.5 MB',
    version: 'v1.1.0',
    releaseDate: 'March 2026',
    developer: 'Academy Guild Office',
    whatsNew: 'Added semester-wise GPA prediction simulator. Improved course credit load calculation rules.',
    featuresList: [
      'Subject cataloging with credit points tracker',
      'Assignment checklist with date notifications',
      'Exam dates reminder system and countdown alerts',
      'Interactive GPA tracker and cumulative statistics card',
    ],
    gradient: 'from-blue-600 to-cyan-500',
  },
  {
    id: 'content',
    name: 'Creator Hub',
    shortDescription: 'Map video scripts, stream schedules, and metrics dashboard.',
    description: 'A dedicated command center for vloggers, streamers, and writers. Brainstorm ideas, transition videos through drafting pipelines, monitor platforms like Twitch or YouTube, and track published logs. Boost your content productivity rating.',
    icon: Video,
    iconName: 'Video',
    category: 'Social',
    rating: 4.6,
    reviews: '1.4k reviews',
    downloads: '32k+ installs',
    downloadsCount: 32000,
    size: '5.9 MB',
    version: 'v1.0.8',
    releaseDate: 'February 2026',
    developer: 'Broadcasting Guild',
    whatsNew: 'Refined cards display for creator idea boards. Added content platform filters.',
    featuresList: [
      'Idea board with status milestones (Drafting, Editing, Done)',
      'Social platforms tags (Twitch, YouTube, TikTok, Medium)',
      'Schedule calendar and content backlog tables',
      'XP rewards upon completing a publication task',
    ],
    gradient: 'from-rose-600 to-pink-600',
  },
]

export default function FeatureShopClient({ initialInstalledFeatures }: FeatureShopClientProps) {
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()
  const [mounted, setMounted] = useState(false)
  const [installedFeatures, setInstalledFeatures] = useState<string[]>(initialInstalledFeatures)
  
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<string>('All')
  const [sortBy, setSortBy] = useState<'installs' | 'rating'>('installs')

  // Details Modal state
  const [selectedFeature, setSelectedFeature] = useState<FeatureItem | null>(null)

  useEffect(() => {
    setMounted(true)
    setInstalledFeatures(initialInstalledFeatures)
  }, [initialInstalledFeatures])

  const handleInstall = (featureId: string) => {
    startTransition(async () => {
      try {
        const res = await installFeatureAction(featureId)
        if (res.success) {
          toast(`${FEATURES_DATA.find((f) => f.id === featureId)?.name} installed successfully!`, 'success')
          const updated = [...installedFeatures, featureId]
          setInstalledFeatures(updated)
          // Broadcast custom event to update sidebar dynamically
          window.dispatchEvent(new Event('features-updated'))
        } else {
          toast(res.error || 'Failed to install feature.', 'error')
        }
      } catch (err) {
        toast('An error occurred during installation.', 'error')
      }
    })
  }

  const handleUninstall = (featureId: string) => {
    startTransition(async () => {
      try {
        const res = await uninstallFeatureAction(featureId)
        if (res.success) {
          toast(`${FEATURES_DATA.find((f) => f.id === featureId)?.name} uninstalled successfully.`, 'info')
          const updated = installedFeatures.filter((id) => id !== featureId)
          setInstalledFeatures(updated)
          // Broadcast custom event to update sidebar dynamically
          window.dispatchEvent(new Event('features-updated'))
        } else {
          toast(res.error || 'Failed to uninstall feature.', 'error')
        }
      } catch (err) {
        toast('An error occurred during uninstallation.', 'error')
      }
    })
  }

  // Filter features
  const filteredFeatures = FEATURES_DATA.filter((feature) => {
    const matchesSearch =
      feature.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      feature.shortDescription.toLowerCase().includes(searchQuery.toLowerCase()) ||
      feature.category.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesCategory = activeCategory === 'All' || feature.category === activeCategory

    return matchesSearch && matchesCategory
  }).sort((a, b) => {
    if (sortBy === 'installs') {
      return b.downloadsCount - a.downloadsCount
    } else {
      return b.rating - a.rating
    }
  })

  // Get most popular feature to feature in the hero section
  const featuredFeature = FEATURES_DATA[0] // Shadow Projects

  // Get ranked list for "Most Installed Bar"
  const rankedFeatures = [...FEATURES_DATA].sort((a, b) => b.downloadsCount - a.downloadsCount)

  return (
    <div className="space-y-8 pb-12 select-none" suppressHydrationWarning>
      {/* Header section */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-linear-to-r from-indigo-500 via-purple-500 to-indigo-300">
            System Feature Shop
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Customize your Solo Leveling terminal. Install high-ranking features.
          </p>
        </div>

        {/* Search bar */}
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search features (e.g. finance, notes)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-11 pl-10 pr-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-background/50 backdrop-blur-sm text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            suppressHydrationWarning
          />
        </div>
      </div>

      {/* Featured Banner Hero - Play Store Style */}
      {activeCategory === 'All' && searchQuery === '' && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl border border-indigo-500/30 bg-linear-to-br from-indigo-950/40 via-purple-950/20 to-zinc-900/60 p-6 md:p-8 shadow-lg backdrop-blur-md"
        >
          {/* Neon Grid Pattern Background */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-size-[14px_24px] pointer-events-none" />
          {/* Subtle Glows */}
          <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

          <div className="relative z-10 grid gap-6 md:grid-cols-2 md:items-center">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-bold text-indigo-400 uppercase tracking-widest">
                <Sparkles className="h-3 w-3" />
                Featured App
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-white">
                {featuredFeature.name}
              </h2>
              <p className="text-zinc-300 text-sm md:text-base leading-relaxed">
                {featuredFeature.shortDescription}
              </p>
              <div className="flex items-center gap-4 text-xs font-bold text-zinc-400">
                <div className="flex items-center gap-1 text-amber-400">
                  <Star className="h-4 w-4 fill-current" />
                  <span>{featuredFeature.rating}</span>
                </div>
                <span>•</span>
                <span>{featuredFeature.downloads}</span>
                <span>•</span>
                <span className="text-zinc-500">{featuredFeature.size}</span>
              </div>
              <div className="flex flex-wrap gap-3 pt-2">
                <Button
                  variant="primary"
                  onClick={() => setSelectedFeature(featuredFeature)}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-md px-6 cursor-pointer"
                >
                  View Details
                </Button>
                {installedFeatures.includes(featuredFeature.id) ? (
                  <Button
                    variant="outline"
                    onClick={() => handleUninstall(featuredFeature.id)}
                    isLoading={isPending}
                    className="border-rose-500/30 text-rose-500 hover:bg-rose-500/10 rounded-xl px-5 cursor-pointer"
                  >
                    Uninstall
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    onClick={() => handleInstall(featuredFeature.id)}
                    isLoading={isPending}
                    className="bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-xl px-5 cursor-pointer"
                  >
                    Install Now
                  </Button>
                )}
              </div>
            </div>

            <div className="hidden md:flex justify-center">
              {/* Dynamic CSS Mockup representing Shadow Projects */}
              <div className="relative w-80 h-48 rounded-xl border border-zinc-700 bg-zinc-950 p-4 shadow-2xl overflow-hidden flex flex-col justify-between">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                  <span className="text-[10px] font-extrabold text-indigo-400 tracking-wider">PROJECT WORKSPACE</span>
                  <div className="h-1.5 w-8 rounded bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
                    <span className="text-[6px] text-emerald-400 font-bold">MILITARY</span>
                  </div>
                </div>
                <div className="space-y-2 py-2">
                  <div className="flex items-center gap-2 bg-indigo-500/5 border border-indigo-500/10 rounded p-1 text-[9px] text-zinc-300">
                    <Check className="h-3 w-3 text-indigo-500 shrink-0" />
                    <span className="truncate flex-1 font-medium">Summon Shadow Soldiers</span>
                    <span className="text-[8px] bg-indigo-500/20 text-indigo-400 px-1 rounded">DONE</span>
                  </div>
                  <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded p-1 text-[9px] text-zinc-400">
                    <div className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0" />
                    <span className="truncate flex-1">Fix dungeon breach in system module</span>
                    <span className="text-[8px] text-rose-400 font-bold">HIGH</span>
                  </div>
                  <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded p-1 text-[9px] text-zinc-400">
                    <div className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                    <span className="truncate flex-1">Prepare content schedule draft</span>
                    <span className="text-[8px] text-amber-400 font-bold">MED</span>
                  </div>
                </div>
                <div className="flex justify-between items-center text-[8px] text-zinc-500 pt-2 border-t border-zinc-900">
                  <span>Completed: 1/3</span>
                  <div className="h-1.5 w-24 rounded-full bg-zinc-800 overflow-hidden">
                    <div className="h-full w-1/3 bg-indigo-500 rounded-full" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Categories & Sorting Tabs */}
      <div className="flex flex-col gap-4 border-b border-zinc-100 dark:border-zinc-800 pb-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Pills category list */}
        <div className="flex flex-wrap gap-2">
          {['All', 'Productivity', 'Finance', 'Education', 'Utilities', 'Social'].map((cat) => {
            const isActive = activeCategory === cat
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                suppressHydrationWarning
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-indigo-500 text-white shadow-sm shadow-indigo-500/25'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800'
                }`}
              >
                {cat}
              </button>
            )
          })}
        </div>

        {/* Sort select */}
        <div className="flex items-center gap-2 text-xs font-semibold">
          <span className="text-zinc-500">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e: any) => setSortBy(e.target.value)}
            className="bg-zinc-100 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 rounded-lg py-1.5 px-3 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            suppressHydrationWarning
          >
            <option value="installs">Most Installed</option>
            <option value="rating">Top Rated</option>
          </select>
        </div>
      </div>

      {/* Main Apps Grid Section */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filteredFeatures.map((feature) => {
          const Icon = feature.icon
          const isInstalled = installedFeatures.includes(feature.id)

          return (
            <motion.div
              layout
              key={feature.id}
              onClick={() => setSelectedFeature(feature)}
              whileHover={{ y: -4 }}
              className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-card hover:shadow-lg dark:hover:border-indigo-500/30 dark:hover:shadow-indigo-500/5 p-5 transition-all cursor-pointer"
            >
              {/* Card top details */}
              <div className="flex gap-4">
                {/* App icon */}
                <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br ${feature.gradient} shadow-md`}>
                  <Icon className="h-7 w-7 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-1">
                    <h3 className="font-bold text-zinc-900 dark:text-zinc-100 truncate group-hover:text-indigo-500 transition-colors">
                      {feature.name}
                    </h3>
                    {isInstalled && (
                      <span className="shrink-0 inline-flex items-center gap-0.5 rounded-full bg-emerald-500/10 dark:bg-emerald-500/25 px-2 py-0.5 text-[9px] font-extrabold text-emerald-600 dark:text-emerald-400">
                        <Check className="h-2.5 w-2.5" />
                        INSTALLED
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
                    {feature.category} • {feature.size}
                  </p>
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                    <div className="flex items-center text-amber-500">
                      <Star className="h-3 w-3 fill-current" />
                      <span className="ml-0.5 font-bold">{feature.rating}</span>
                    </div>
                    <span>•</span>
                    <span className="text-[10px]">{feature.downloads}</span>
                  </div>
                </div>
              </div>

              {/* Card description */}
              <p className="mt-4 text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                {feature.shortDescription}
              </p>

              {/* Action area */}
              <div className="mt-5 flex items-center justify-between gap-2 border-t border-zinc-100 dark:border-zinc-800/80 pt-3">
                <span className="text-[10px] font-medium text-zinc-400">
                  By {feature.developer}
                </span>

                <div onClick={(e) => e.stopPropagation()}>
                  {isInstalled ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUninstall(feature.id)}
                      isLoading={isPending}
                      className="h-8 min-h-8 border-rose-500/30 text-rose-500 hover:bg-rose-500/10 text-xs px-3 rounded-lg cursor-pointer"
                    >
                      Uninstall
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleInstall(feature.id)}
                      isLoading={isPending}
                      className="h-8 min-h-8 bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-3 rounded-lg cursor-pointer"
                    >
                      Install
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          )
        })}

        {filteredFeatures.length === 0 && (
          <div className="col-span-full py-16 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
            <Layers className="h-10 w-10 text-zinc-400 mx-auto opacity-50" />
            <p className="mt-3 text-sm font-bold text-zinc-500">No raider features found.</p>
            <p className="text-xs text-zinc-400 mt-1">Try resetting category filters or search queries.</p>
          </div>
        )}
      </div>

      {/* Most Installed Rank Row Bar - Play Store Top Charts style */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-6">
          <TrendingUp className="h-5 w-5 text-indigo-500" />
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Top Popular Free Features</h3>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {rankedFeatures.map((feature, idx) => {
            const Icon = feature.icon
            const isInstalled = installedFeatures.includes(feature.id)

            return (
              <div
                key={`rank-${feature.id}`}
                onClick={() => setSelectedFeature(feature)}
                className="flex items-center gap-4 p-3 rounded-xl border border-zinc-100 hover:border-indigo-500/20 hover:bg-indigo-500/5 dark:border-zinc-800/60 dark:hover:bg-indigo-500/5 transition-all cursor-pointer group"
              >
                {/* Rank number */}
                <span className="text-lg font-black text-zinc-400 dark:text-zinc-600 w-6 text-center group-hover:text-indigo-500 transition-colors">
                  {idx + 1}
                </span>

                {/* Small App Icon */}
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br ${feature.gradient} shadow-sm`}>
                  <Icon className="h-5 w-5 text-white" />
                </div>

                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-xs text-zinc-900 dark:text-zinc-100 truncate group-hover:text-indigo-400">
                    {feature.name}
                  </h4>
                  <p className="text-[10px] text-zinc-500 truncate">
                    {feature.category} • {feature.downloads}
                  </p>
                </div>

                {isInstalled && (
                  <span className="shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
                    <Check className="h-3 w-3" />
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* App Drawer / Detail Modal overlay */}
      <AnimatePresence>
        {selectedFeature && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-card p-6 md:p-8 shadow-2xl space-y-6"
            >
              {/* Close Button */}
              <button
                onClick={() => setSelectedFeature(null)}
                className="absolute right-4 top-4 min-h-11 min-w-11 rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 transition-colors cursor-pointer flex items-center justify-center"
                aria-label="Close modal"
              >
                <X className="h-5 w-5" />
              </button>

              {/* Modal App Header */}
              <div className="flex gap-6 pb-6 border-b border-zinc-100 dark:border-zinc-800/80">
                <div className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br ${selectedFeature.gradient} shadow-lg`}>
                  {React.createElement(selectedFeature.icon, { className: 'h-10 w-10 text-white' })}
                </div>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <h2 className="text-xl md:text-2xl font-extrabold text-zinc-900 dark:text-zinc-100">
                    {selectedFeature.name}
                  </h2>
                  <p className="text-xs text-indigo-500 font-bold uppercase tracking-wider">
                    {selectedFeature.developer}
                  </p>
                  <p className="text-xs text-zinc-500 font-medium">
                    Category: {selectedFeature.category} • Version: {selectedFeature.version}
                  </p>
                </div>
              </div>

              {/* Statistics Grid - Play store style layout */}
              <div className="grid grid-cols-3 gap-2 text-center py-2 bg-zinc-50 dark:bg-zinc-900/40 rounded-xl border border-zinc-100 dark:border-zinc-850">
                <div className="space-y-0.5 border-r border-zinc-200 dark:border-zinc-800/80">
                  <div className="flex items-center justify-center text-sm font-black text-zinc-900 dark:text-zinc-100 gap-0.5">
                    <span>{selectedFeature.rating}</span>
                    <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                  </div>
                  <p className="text-[10px] text-zinc-400 font-semibold uppercase">{selectedFeature.reviews}</p>
                </div>
                <div className="space-y-0.5 border-r border-zinc-200 dark:border-zinc-800/80">
                  <div className="text-sm font-black text-zinc-900 dark:text-zinc-100 flex items-center justify-center gap-0.5">
                    <Download className="h-3.5 w-3.5 text-indigo-500" />
                    <span>{selectedFeature.size}</span>
                  </div>
                  <p className="text-[10px] text-zinc-400 font-semibold uppercase">Size</p>
                </div>
                <div className="space-y-0.5">
                  <div className="text-sm font-black text-zinc-900 dark:text-zinc-100">
                    {selectedFeature.downloads.split(' ')[0]}
                  </div>
                  <p className="text-[10px] text-zinc-400 font-semibold uppercase">Installs</p>
                </div>
              </div>

              {/* Install / Uninstall Controls */}
              <div className="flex gap-4 pt-1">
                {installedFeatures.includes(selectedFeature.id) ? (
                  <>
                    <Button
                      variant="destructive"
                      onClick={() => handleUninstall(selectedFeature.id)}
                      isLoading={isPending}
                      className="flex-1 rounded-xl shadow-md cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Uninstall Feature
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedFeature(null)
                        // Trigger client-side navigation
                        window.location.href = `/dashboard/${selectedFeature.id === 'content' ? 'content' : selectedFeature.id}`
                      }}
                      className="border-indigo-500 text-indigo-500 hover:bg-indigo-500/10 rounded-xl cursor-pointer"
                    >
                      Open Module
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="primary"
                    onClick={() => handleInstall(selectedFeature.id)}
                    isLoading={isPending}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-md cursor-pointer"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Install App (Add to Sidebar)
                  </Button>
                )}
              </div>

              {/* Description */}
              <div className="space-y-2">
                <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">About this App</h4>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  {selectedFeature.description}
                </p>
              </div>

              {/* Mockup Showcase - Dynamic Representation */}
              <div className="space-y-2">
                <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">Module Interface Preview</h4>
                
                {/* Dynamically render a beautiful css card based on feature ID */}
                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-900 dark:bg-zinc-950 p-4 text-[11px] overflow-hidden relative">
                  {selectedFeature.id === 'college' && (
                    <div className="space-y-2 text-zinc-400">
                      <div className="flex justify-between font-bold text-indigo-400 border-b border-zinc-800 pb-1">
                        <span>COLLEGE LEDGER</span>
                        <span>GPA: 3.84 / 4.00</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-zinc-900 border border-zinc-800 rounded p-1.5 text-center">
                          <span className="block text-[8px] text-zinc-500">Credits</span>
                          <span className="font-bold text-zinc-200">18 / 21</span>
                        </div>
                        <div className="bg-zinc-900 border border-zinc-800 rounded p-1.5 text-center">
                          <span className="block text-[8px] text-zinc-500">Assignments</span>
                          <span className="font-bold text-rose-400">2 Pending</span>
                        </div>
                        <div className="bg-zinc-900 border border-zinc-800 rounded p-1.5 text-center">
                          <span className="block text-[8px] text-zinc-500">Exams</span>
                          <span className="font-bold text-amber-400">1 Imminent</span>
                        </div>
                      </div>
                      <div className="bg-zinc-900/50 p-2 rounded border border-zinc-800/80">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="font-bold text-zinc-300">Advanced Algorithms Exam Raid</span>
                          <span className="text-[8px] text-zinc-500">Starts in 2 days</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedFeature.id === 'projects' && (
                    <div className="space-y-2 text-zinc-400">
                      <div className="flex justify-between font-bold text-purple-400 border-b border-zinc-800 pb-1">
                        <span>ACTIVE PROJECTS WORKSPACE</span>
                        <span>Raids Clear: 67%</span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between bg-zinc-900 p-1.5 rounded border border-zinc-800">
                          <span className="font-bold text-zinc-300">⚔️ Web API Dungeon</span>
                          <div className="h-1.5 w-16 bg-zinc-800 rounded-full overflow-hidden">
                            <div className="h-full w-[80%] bg-purple-500 rounded-full" />
                          </div>
                        </div>
                        <div className="flex items-center justify-between bg-zinc-900 p-1.5 rounded border border-zinc-800">
                          <span className="font-bold text-zinc-300">⚔️ Android UI Guild</span>
                          <div className="h-1.5 w-16 bg-zinc-800 rounded-full overflow-hidden">
                            <div className="h-full w-[45%] bg-purple-500 rounded-full" />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedFeature.id === 'notes' && (
                    <div className="space-y-2 text-zinc-400">
                      <div className="flex justify-between font-bold text-teal-400 border-b border-zinc-800 pb-1">
                        <span>KNOWLEDGE SCROLLS</span>
                        <span>3 pinned notes</span>
                      </div>
                      <div className="space-y-1.5">
                        <div className="bg-zinc-900 p-1.5 rounded border-l-2 border-l-teal-500 border border-zinc-800">
                          <span className="font-bold text-zinc-200 block text-[10px]">📌 Dungeon Raid Strategies</span>
                          <span className="text-[9px] text-zinc-500 block truncate">1. Inspect coordinates. 2. Keep potions nearby...</span>
                        </div>
                        <div className="bg-zinc-900 p-1.5 rounded border-l-2 border-l-zinc-600 border border-zinc-800">
                          <span className="font-bold text-zinc-300 block text-[10px]">Daily Retro Notes</span>
                          <span className="text-[9px] text-zinc-500 block truncate">Focus timer worked well today, earned 40 XP...</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedFeature.id === 'content' && (
                    <div className="space-y-2 text-zinc-400">
                      <div className="flex justify-between font-bold text-rose-400 border-b border-zinc-800 pb-1">
                        <span>BROADCASTING PIPELINE</span>
                        <span>4 Active Ideas</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-[9px] text-center">
                        <div className="bg-zinc-900 p-1 rounded border border-zinc-850">
                          <span className="block text-zinc-500 font-bold uppercase">Drafting</span>
                          <span className="text-zinc-200">2 ideas</span>
                        </div>
                        <div className="bg-indigo-500/10 p-1 rounded border border-indigo-500/20 text-indigo-400">
                          <span className="block font-bold uppercase">Editing</span>
                          <span className="text-indigo-300 font-medium">1 idea</span>
                        </div>
                        <div className="bg-emerald-500/10 p-1 rounded border border-emerald-500/20 text-emerald-400">
                          <span className="block font-bold uppercase">Done</span>
                          <span className="text-emerald-300">1 idea</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedFeature.id === 'finance' && (
                    <div className="space-y-2 text-zinc-400">
                      <div className="flex justify-between font-bold text-amber-500 border-b border-zinc-800 pb-1">
                        <span>MONARCH LEDGER</span>
                        <span>Balance: 12,450 Gold</span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-[9px]">
                          <span>Dungeon Equipment Budget</span>
                          <span className="text-amber-500 font-bold">420 / 600 Gold used</span>
                        </div>
                        <div className="h-2 w-full bg-zinc-850 rounded-full overflow-hidden">
                          <div className="h-full w-[70%] bg-amber-500 rounded-full" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Features key benefits */}
              <div className="space-y-2">
                <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">Key Features</h4>
                <ul className="list-inside list-disc text-xs text-zinc-650 dark:text-zinc-450 space-y-1">
                  {selectedFeature.featuresList.map((item, idx) => (
                    <li key={idx} className="leading-relaxed pl-1">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* What's New */}
              <div className="space-y-2 border-t border-zinc-100 dark:border-zinc-800/80 pt-4">
                <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">What's New</h4>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  {selectedFeature.whatsNew}
                </p>
              </div>

              {/* Developer Metadata */}
              <div className="grid grid-cols-2 gap-4 text-[10px] text-zinc-400 pt-4 border-t border-zinc-100 dark:border-zinc-800/80">
                <div>
                  <span className="font-semibold block text-zinc-500">Released</span>
                  <span>{selectedFeature.releaseDate}</span>
                </div>
                <div>
                  <span className="font-semibold block text-zinc-500">Permissions</span>
                  <span className="flex items-center gap-1">
                    <Info className="h-3 w-3 shrink-0" />
                    Storage & Mongoose Write
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
