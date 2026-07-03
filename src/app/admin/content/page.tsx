'use client'

import React, { useEffect, useState, useTransition } from 'react'
import { useToast } from '@/components/ui/Toast'
import {
  fetchSystemContent,
  saveSystemContentAction,
  fetchSanityContent,
  SanityPostSummary,
} from '@/actions/adminContentActions'
import {
  FileText,
  HelpCircle,
  TrendingUp,
  Globe,
  Database,
  ExternalLink,
  Plus,
  Trash2,
  Save,
  Loader2,
} from 'lucide-react'

export default function AdminContentPage() {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<'seo' | 'faqs' | 'changelog' | 'sanity'>('seo')
  const [loading, setLoading] = useState(true)
  const [isPending, startTransition] = useTransition()

  // State arrays for different forms
  const [seo, setSeo] = useState({ title: '', description: '', keywords: '', canonicalUrl: '' })
  const [faqs, setFaqs] = useState<Array<{ id: string; question: string; answer: string }>>([])
  const [changelog, setChangelog] = useState<Array<{ id: string; version: string; date: string; title: string; description: string }>>([])
  const [sanityPosts, setSanityPosts] = useState<SanityPostSummary[]>([])
  const [sanityVision, setSanityVision] = useState(false)

  // Load everything
  useEffect(() => {
    async function loadContent() {
      setLoading(true)
      try {
        const [seoData, faqsData, changelogData, sanityData] = await Promise.all([
          fetchSystemContent('seo_metadata'),
          fetchSystemContent('faqs'),
          fetchSystemContent('changelog'),
          fetchSanityContent(),
        ])

        if (seoData) setSeo(seoData)
        if (faqsData) setFaqs(faqsData)
        if (changelogData) setChangelog(changelogData)
        if (sanityData) {
          setSanityPosts(sanityData.posts)
          setSanityVision(sanityData.visionEnabled)
        }
      } catch (err) {
        toast('Failed to load system layouts content', 'error')
      } finally {
        setLoading(false)
      }
    }
    loadContent()
  }, [])

  // Save SEO Metadata
  const handleSaveSeo = async (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const res = await saveSystemContentAction('seo_metadata', seo)
      if (res.success) {
        toast('SEO Metadata updated successfully!', 'success')
      } else {
        toast(res.error || 'Failed to update SEO metadata', 'error')
      }
    })
  }

  // Save FAQs
  const handleSaveFaqs = async () => {
    startTransition(async () => {
      const res = await saveSystemContentAction('faqs', faqs)
      if (res.success) {
        toast('FAQs directory saved successfully!', 'success')
      } else {
        toast(res.error || 'Failed to save FAQs', 'error')
      }
    })
  }

  // Save Changelog
  const handleSaveChangelog = async () => {
    startTransition(async () => {
      const res = await saveSystemContentAction('changelog', changelog)
      if (res.success) {
        toast('System changelog saved successfully!', 'success')
      } else {
        toast(res.error || 'Failed to save changelog', 'error')
      }
    })
  }

  // Add dynamic FAQ row
  const handleAddFaq = () => {
    setFaqs([...faqs, { id: Math.random().toString(36).substring(2, 9), question: '', answer: '' }])
  }

  // Remove FAQ row
  const handleRemoveFaq = (id: string) => {
    setFaqs(faqs.filter((f) => f.id !== id))
  }

  // Update FAQ details inline
  const handleUpdateFaq = (id: string, field: 'question' | 'answer', value: string) => {
    setFaqs(faqs.map((f) => (f.id === id ? { ...f, [field]: value } : f)))
  }

  // Add dynamic Changelog row
  const handleAddChangelog = () => {
    setChangelog([
      ...changelog,
      {
        id: Math.random().toString(36).substring(2, 9),
        version: '',
        date: new Date().toISOString().slice(0, 10),
        title: '',
        description: '',
      },
    ])
  }

  // Remove Changelog row
  const handleRemoveChangelog = (id: string) => {
    setChangelog(changelog.filter((c) => c.id !== id))
  }

  // Update Changelog details inline
  const handleUpdateChangelog = (id: string, field: string, value: string) => {
    setChangelog(changelog.map((c) => (c.id === id ? { ...c, [field]: value } : c)))
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-zinc-400" aria-label="Loading content manager">
        <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div>
        <h1 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-3xl">
          Content Center
        </h1>
        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
          Manage landing pages, FAQ lists, SEO tags, and view CMS logs.
        </p>
      </div>

      {/* Tabs navigation panel */}
      <div className="flex border-b border-border/40 pb-2">
        <button
          onClick={() => setActiveTab('seo')}
          className={`mr-6 flex items-center gap-1.5 border-b-2 pb-2 text-xs font-bold transition-all ${
            activeTab === 'seo'
              ? 'border-violet-500 text-violet-500'
              : 'border-transparent text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
          }`}
        >
          <Globe className="h-4 w-4" />
          SEO Meta Headers
        </button>

        <button
          onClick={() => setActiveTab('faqs')}
          className={`mr-6 flex items-center gap-1.5 border-b-2 pb-2 text-xs font-bold transition-all ${
            activeTab === 'faqs'
              ? 'border-violet-500 text-violet-500'
              : 'border-transparent text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
          }`}
        >
          <HelpCircle className="h-4 w-4" />
          Platform FAQs
        </button>

        <button
          onClick={() => setActiveTab('changelog')}
          className={`mr-6 flex items-center gap-1.5 border-b-2 pb-2 text-xs font-bold transition-all ${
            activeTab === 'changelog'
              ? 'border-violet-500 text-violet-500'
              : 'border-transparent text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
          }`}
        >
          <TrendingUp className="h-4 w-4" />
          Changelog Releases
        </button>

        <button
          onClick={() => setActiveTab('sanity')}
          className={`flex items-center gap-1.5 border-b-2 pb-2 text-xs font-bold transition-all ${
            activeTab === 'sanity'
              ? 'border-violet-500 text-violet-500'
              : 'border-transparent text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
          }`}
        >
          <Database className="h-4 w-4" />
          Sanity CMS
        </button>
      </div>

      {/* Tab Panel: SEO Metadata */}
      {activeTab === 'seo' && (
        <div className="rounded-xl border border-border bg-card/25 p-6 backdrop-blur-md max-w-xl">
          <form onSubmit={handleSaveSeo} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-zinc-500">Website Global Title</label>
              <input
                type="text"
                value={seo.title}
                onChange={(e) => setSeo({ ...seo, title: e.target.value })}
                className="w-full rounded-lg border border-border bg-zinc-50/50 p-2.5 text-xs font-semibold text-zinc-700 outline-none focus:border-violet-500 dark:bg-zinc-950/20 dark:text-zinc-300"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-zinc-500">Meta Description</label>
              <textarea
                value={seo.description}
                onChange={(e) => setSeo({ ...seo, description: e.target.value })}
                rows={3}
                className="w-full rounded-lg border border-border bg-zinc-50/50 p-2.5 text-xs font-semibold text-zinc-700 outline-none focus:border-violet-500 dark:bg-zinc-950/20 dark:text-zinc-300"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-zinc-500">SEO Keywords (comma separated)</label>
              <input
                type="text"
                value={seo.keywords}
                onChange={(e) => setSeo({ ...seo, keywords: e.target.value })}
                className="w-full rounded-lg border border-border bg-zinc-50/50 p-2.5 text-xs font-semibold text-zinc-700 outline-none focus:border-violet-500 dark:bg-zinc-950/20 dark:text-zinc-300"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-zinc-500">Canonical URL Domain</label>
              <input
                type="url"
                value={seo.canonicalUrl}
                onChange={(e) => setSeo({ ...seo, canonicalUrl: e.target.value })}
                className="w-full rounded-lg border border-border bg-zinc-50/50 p-2.5 text-xs font-semibold text-zinc-700 outline-none focus:border-violet-500 dark:bg-zinc-950/20 dark:text-zinc-300"
              />
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="flex min-h-10 items-center justify-center gap-2 rounded-lg bg-violet-600 px-5 text-xs font-bold text-white shadow hover:bg-violet-700 disabled:opacity-50"
            >
              {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Save Metadata Configuration
            </button>
          </form>
        </div>
      )}

      {/* Tab Panel: FAQs */}
      {activeTab === 'faqs' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-zinc-600 dark:text-zinc-400">FAQs List Directory</h3>
            <button
              onClick={handleAddFaq}
              className="flex min-h-9 items-center justify-center gap-1 rounded-lg border border-border bg-card px-3 text-xs font-bold text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <Plus className="h-4 w-4 text-violet-500" />
              Add Question
            </button>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => (
              <div
                key={faq.id}
                className="rounded-xl border border-border bg-card/25 p-4 backdrop-blur-md flex gap-4 items-start"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-500/10 text-xs font-black text-violet-500">
                  {idx + 1}
                </span>

                <div className="flex-1 space-y-3">
                  <input
                    type="text"
                    value={faq.question}
                    onChange={(e) => handleUpdateFaq(faq.id, 'question', e.target.value)}
                    placeholder="Enter FAQ Question"
                    className="w-full rounded-lg border border-border bg-zinc-50/50 p-2.5 text-xs font-bold text-zinc-700 outline-none focus:border-violet-500 dark:bg-zinc-950/20 dark:text-zinc-300"
                  />
                  <textarea
                    value={faq.answer}
                    onChange={(e) => handleUpdateFaq(faq.id, 'answer', e.target.value)}
                    placeholder="Enter FAQ Answer"
                    rows={2}
                    className="w-full rounded-lg border border-border bg-zinc-50/50 p-2.5 text-xs font-semibold text-zinc-700 outline-none focus:border-violet-500 dark:bg-zinc-950/20 dark:text-zinc-300"
                  />
                </div>

                <button
                  onClick={() => handleRemoveFaq(faq.id)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-transparent text-rose-500 hover:bg-rose-500/10"
                  aria-label="Remove FAQ"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={handleSaveFaqs}
            disabled={isPending}
            className="flex min-h-10 items-center justify-center gap-2 rounded-lg bg-violet-600 px-5 text-xs font-bold text-white shadow hover:bg-violet-700 disabled:opacity-50"
          >
            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save FAQs Directory
          </button>
        </div>
      )}

      {/* Tab Panel: Changelog */}
      {activeTab === 'changelog' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-zinc-600 dark:text-zinc-400">Release Changelogs</h3>
            <button
              onClick={handleAddChangelog}
              className="flex min-h-9 items-center justify-center gap-1 rounded-lg border border-border bg-card px-3 text-xs font-bold text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <Plus className="h-4 w-4 text-violet-500" />
              Add Release Row
            </button>
          </div>

          <div className="space-y-3">
            {changelog.map((c) => (
              <div
                key={c.id}
                className="rounded-xl border border-border bg-card/25 p-4 backdrop-blur-md flex gap-4 items-start"
              >
                <div className="flex-1 grid gap-3 md:grid-cols-3">
                  <input
                    type="text"
                    value={c.version}
                    onChange={(e) => handleUpdateChangelog(c.id, 'version', e.target.value)}
                    placeholder="Version (e.g. v1.1.0)"
                    className="rounded-lg border border-border bg-zinc-50/50 p-2.5 text-xs font-bold text-zinc-700 outline-none focus:border-violet-500 dark:bg-zinc-950/20 dark:text-zinc-300"
                  />
                  <input
                    type="date"
                    value={c.date}
                    onChange={(e) => handleUpdateChangelog(c.id, 'date', e.target.value)}
                    className="rounded-lg border border-border bg-zinc-50/50 p-2.5 text-xs font-semibold text-zinc-700 outline-none focus:border-violet-500 dark:bg-zinc-950/20 dark:text-zinc-300"
                  />
                  <input
                    type="text"
                    value={c.title}
                    onChange={(e) => handleUpdateChangelog(c.id, 'title', e.target.value)}
                    placeholder="Release Summary Title"
                    className="rounded-lg border border-border bg-zinc-50/50 p-2.5 text-xs font-bold text-zinc-700 outline-none focus:border-violet-500 dark:bg-zinc-950/20 dark:text-zinc-300"
                  />
                  <textarea
                    value={c.description}
                    onChange={(e) => handleUpdateChangelog(c.id, 'description', e.target.value)}
                    placeholder="Provide details about updates, bugs fixed, or features deployed..."
                    rows={2}
                    className="md:col-span-3 w-full rounded-lg border border-border bg-zinc-50/50 p-2.5 text-xs font-semibold text-zinc-700 outline-none focus:border-violet-500 dark:bg-zinc-950/20 dark:text-zinc-300"
                  />
                </div>

                <button
                  onClick={() => handleRemoveChangelog(c.id)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-transparent text-rose-500 hover:bg-rose-500/10"
                  aria-label="Remove changelog release row"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={handleSaveChangelog}
            disabled={isPending}
            className="flex min-h-10 items-center justify-center gap-2 rounded-lg bg-violet-600 px-5 text-xs font-bold text-white shadow hover:bg-violet-700 disabled:opacity-50"
          >
            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save Changelog
          </button>
        </div>
      )}

      {/* Tab Panel: Sanity CMS */}
      {activeTab === 'sanity' && (
        <div className="space-y-6 max-w-2xl">
          {/* Studio launchers */}
          <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-6 backdrop-blur-md flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-black text-zinc-800 dark:text-zinc-100 flex items-center gap-1.5">
                Sanity Content Management
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                Edit schemas, blog articles, resources, and custom content blocks directly in the local Sanity Studio route.
              </p>
            </div>
            <a
              href="/sanity"
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-10 items-center justify-center gap-1.5 rounded-lg bg-violet-600 px-4 text-xs font-bold text-white shadow hover:bg-violet-700"
            >
              Launch Sanity Studio
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>

          {/* CMS items preview */}
          <div className="rounded-xl border border-border bg-card/25 p-5 backdrop-blur-md">
            <h4 className="text-xs font-extrabold uppercase tracking-widest text-zinc-400 mb-4">
              Registered Blog Articles (CMS Sync)
            </h4>

            {sanityPosts.length > 0 ? (
              <div className="space-y-3">
                {sanityPosts.map((post) => (
                  <div key={post._id} className="flex items-center justify-between border-b border-border/20 pb-3 last:border-0 last:pb-0">
                    <div>
                      <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">{post.title}</p>
                      {post.slug && (
                        <p className="text-[10px] font-semibold text-zinc-400">Slug: {post.slug}</p>
                      )}
                    </div>
                    {post.publishedAt && (
                      <span className="text-[10px] font-bold text-zinc-400">
                        {new Date(post.publishedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-32 items-center justify-center text-xs font-bold text-zinc-400">
                No blog content articles detected in local dataset.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
