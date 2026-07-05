'use client'

import React, { useState, useTransition } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Calendar as CalendarIcon,
  Check,
  Edit3,
  FileUp,
  Instagram,
  Linkedin,
  Plus,
  Save,
  Trash2,
  Twitter,
  Upload,
  Video,
  X,
  Youtube,
  Bell,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { useToast } from '@/components/ui/Toast'
import { ReminderConfigPanel } from '@/components/ui/ReminderConfigPanel'
import {
  createContentIdeaAction,
  deleteContentIdeaAction,
  updateContentIdeaAction,
} from '@/actions/contentActions'

type ContentPlatform = 'YouTube' | 'Instagram' | 'Twitter' | 'LinkedIn' | 'Portfolio' | 'Other'
type ContentStatus = 'Idea' | 'Scripting' | 'Recording' | 'Editing' | 'Posted'

interface ContentIdea {
  _id: string
  title: string
  platform: ContentPlatform
  status: ContentStatus
  script?: string
  scheduledDate?: string
  notes?: string
  mediaUrl?: string
  reminderConfigs?: Array<{ enabled: boolean; reminderTime: string; message?: string; notificationType: 'email' | 'in-app' | 'both' }>
}

interface ContentClientProps {
  initialIdeas: ContentIdea[]
}

type ContentForm = {
  title: string
  platform: ContentPlatform
  status: ContentStatus
  scheduledDate: string
  notes: string
  script: string
  mediaUrl: string
  reminderConfigs: Array<{ enabled: boolean; reminderTime: string; message?: string; notificationType: 'email' | 'in-app' | 'both' }>
}

const emptyForm: ContentForm = {
  title: '',
  platform: 'YouTube',
  status: 'Idea',
  scheduledDate: '',
  notes: '',
  script: '',
  mediaUrl: '',
  reminderConfigs: [],
}

const platforms: ContentPlatform[] = ['YouTube', 'Instagram', 'Twitter', 'LinkedIn', 'Portfolio', 'Other']
const statuses: ContentStatus[] = ['Idea', 'Scripting', 'Recording', 'Editing', 'Posted']

const platformIcons: Record<ContentPlatform, React.ReactNode> = {
  YouTube: <Youtube className="h-4 w-4 fill-current text-rose-500" />,
  Instagram: <Instagram className="h-4 w-4 text-pink-500" />,
  Twitter: <Twitter className="h-4 w-4 fill-current text-sky-500" />,
  LinkedIn: <Linkedin className="h-4 w-4 fill-current text-indigo-500" />,
  Portfolio: <FileUp className="h-4 w-4 fill-current text-green-500" />,
  Other: <Upload className="h-4 w-4 fill-current text-gray-500" />,
}

function toDateInput(value?: string) {
  if (!value) return ''
  return new Date(value).toISOString().split('T')[0]
}

function ideaToForm(idea: ContentIdea): ContentForm {
  return {
    title: idea.title,
    platform: idea.platform,
    status: idea.status,
    scheduledDate: toDateInput(idea.scheduledDate),
    notes: idea.notes || '',
    script: idea.script || '',
    mediaUrl: idea.mediaUrl || '',
    reminderConfigs: idea.reminderConfigs || [],
  }
}

export default function ContentClient({ initialIdeas }: ContentClientProps) {
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()
  const [ideas, setIdeas] = useState<ContentIdea[]>(initialIdeas)
  const [selectedIdea, setSelectedIdea] = useState<ContentIdea | null>(initialIdeas[0] || null)
  const [batchPlanner, setBatchPlanner] = useState<string[]>([])
  const [form, setForm] = useState<ContentForm>(initialIdeas[0] ? ideaToForm(initialIdeas[0]) : emptyForm)
  const [uploading, setUploading] = useState(false)
  const [showReminderModal, setShowReminderModal] = useState(false)
  const [selectedContentForReminder, setSelectedContentForReminder] = useState<ContentIdea | null>(null)

  const scheduledIdeas = ideas
    .filter((idea) => idea.scheduledDate)
    .sort((a, b) => new Date(a.scheduledDate!).getTime() - new Date(b.scheduledDate!).getTime())

  const handleSelectIdea = (idea: ContentIdea) => {
    setSelectedIdea(idea)
    setForm(ideaToForm(idea))
  }

  const handleNewIdea = () => {
    setSelectedIdea(null)
    setForm(emptyForm)
  }

  const handleChange = (
    field: keyof ContentForm,
    value: string
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    const uploadData = new FormData()
    uploadData.append('file', file)

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: uploadData,
      })

      if (!res.ok) throw new Error('Upload failed')

      const data = await res.json()
      setForm((prev) => ({ ...prev, mediaUrl: data.url }))
      toast(data.fallback ? 'Cloudinary is not configured. Added fallback media URL.' : 'File uploaded to Cloudinary.', data.fallback ? 'warning' : 'success')
    } catch (error) {
      console.error(error)
      toast('Failed to upload file.', 'error')
    } finally {
      setUploading(false)
    }
  }

  const handleSave = (event: React.FormEvent) => {
  event.preventDefault()
  startTransition(async () => {
    let res;
    
    // Call the actions directly so Next.js static analysis reads them clearly
    if (selectedIdea) {
      res = await updateContentIdeaAction(selectedIdea._id, form as any);
    } else {
      res = await createContentIdeaAction(form as any);
    }

    if (!res.success || !res.idea) {
      toast(res.error || 'Unable to save content idea.', 'error')
      return
    }
    
    const savedIdea = res.idea as ContentIdea
    setIdeas((prev) => {
      if (selectedIdea) {
        return prev.map((idea) => (idea._id === savedIdea._id ? savedIdea : idea))
      }
      return [savedIdea, ...prev]
    })
    setSelectedIdea(savedIdea)
    setForm(ideaToForm(savedIdea))
    toast(res.message || 'Content idea saved.', 'success')
  })
}


  const handleDelete = () => {
    if (!selectedIdea) return
    if (!confirm('Delete this content idea permanently?')) return

    startTransition(async () => {
      const res = await deleteContentIdeaAction(selectedIdea._id)
      if (!res.success) {
        toast(res.error || 'Unable to delete content idea.', 'error')
        return
      }

      const remaining = ideas.filter((idea) => idea._id !== selectedIdea._id)
      setIdeas(remaining)
      setBatchPlanner((prev) => prev.filter((id) => id !== selectedIdea._id))
      setSelectedIdea(remaining[0] || null)
      setForm(remaining[0] ? ideaToForm(remaining[0]) : emptyForm)
      toast(res.message || 'Content idea deleted.', 'info')
    })
  }

  const handleToggleBatch = (id: string) => {
    const exists = batchPlanner.includes(id)
    setBatchPlanner((prev) => (exists ? prev.filter((item) => item !== id) : [...prev, id]))
    toast(exists ? 'Removed from batch planner.' : 'Added to batch planner checklist.', exists ? 'info' : 'success')
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-sans text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-white">
            Creator Hub
          </h1>
          <p className="mt-1 text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Add, update, delete, script, schedule, and attach Cloudinary media in one workspace
          </p>
        </div>

        <Button onClick={handleNewIdea} variant="primary" className="gap-2">
          <Plus className="h-4 w-4" />
          New Idea
        </Button>
      </div>

      <div className="grid grid-cols-1 items-stretch gap-6 xl:grid-cols-[minmax(17rem,22rem)_1fr]">
        <aside className="flex min-h-[420px] flex-col overflow-hidden rounded-xl border border-border bg-card/25 p-4 xl:h-[calc(100vh-220px)]">
          <p className="mb-4 pl-1 text-xs font-bold uppercase tracking-wider text-zinc-400">
            Idea Bank
          </p>

          <div className="flex-1 space-y-2 overflow-y-auto pr-1">
            {ideas.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-sm text-zinc-500">
                <Video className="h-8 w-8 text-indigo-500" />
                <p>No content ideas yet. Create your first one here.</p>
              </div>
            ) : (
              ideas.map((idea) => {
                const isSelected = selectedIdea?._id === idea._id

                return (
                  <button
                    key={idea._id}
                    type="button"
                    suppressHydrationWarning
                    onClick={() => handleSelectIdea(idea)}
                    className={`w-full rounded-lg border p-3.5 text-left transition-all ${
                      isSelected
                        ? 'border-indigo-500/20 bg-indigo-500/10 text-indigo-500 shadow-sm'
                        : 'border-border bg-card hover:border-zinc-300 dark:hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          {platformIcons[idea.platform]}
                          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                            {idea.platform}
                          </span>
                        </div>
                        <h4 className="truncate text-sm font-bold text-zinc-950 dark:text-zinc-50">
                          {idea.title}
                        </h4>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedContentForReminder(idea)
                            setShowReminderModal(true)
                          }}
                          variant="ghost"
                          size="sm"
                          className="text-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 p-1 h-6 w-6"
                        >
                          <Bell className="h-3.5 w-3.5" />
                        </Button>
                        <span className={`shrink-0 rounded border px-1.5 py-0.5 text-[9px] font-extrabold uppercase ${
                          idea.status === 'Posted'
                            ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500'
                            : idea.status === 'Editing'
                              ? 'border-amber-500/20 bg-amber-500/10 text-amber-500'
                              : 'border-border bg-zinc-500/10 text-zinc-500'
                        }`}>
                          {idea.status}
                        </span>
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </aside>

        <section className="rounded-xl border border-border bg-card/25">
          <form onSubmit={handleSave} className="flex min-h-[520px] flex-col">
            <div className="flex flex-col gap-4 border-b border-border/40 bg-card/40 p-4 backdrop-blur-md lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-zinc-400">
                  {selectedIdea ? <Edit3 className="h-4 w-4 text-indigo-500" /> : <Plus className="h-4 w-4 text-indigo-500" />}
                  {selectedIdea ? 'Editing content idea' : 'New content idea'}
                </div>
                <h2 className="text-lg font-bold text-zinc-950 dark:text-white">
                  {form.title || 'Untitled content draft'}
                </h2>
              </div>

              <div className="flex flex-wrap gap-2">
                {selectedIdea && (
                  <Button
                    type="button"
                    onClick={() => handleToggleBatch(selectedIdea._id)}
                    variant={batchPlanner.includes(selectedIdea._id) ? 'primary' : 'outline'}
                    size="sm"
                    className="gap-1"
                  >
                    {batchPlanner.includes(selectedIdea._id) && <Check className="h-3.5 w-3.5" />}
                    Batch shoot
                  </Button>
                )}
                {selectedIdea && (
                  <Button type="button" onClick={handleDelete} variant="ghost" size="sm" className="gap-1 text-rose-500 hover:bg-rose-500/10">
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                )}
                <Button type="submit" variant="primary" size="sm" className="gap-1" isLoading={isPending || uploading}>
                  <Save className="h-4 w-4" />
                  Save
                </Button>
              </div>
            </div>

            <div className="grid flex-1 gap-4 p-4 lg:grid-cols-2">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="content-title">Title</Label>
                  <Input
                    id="content-title"
                    value={form.title}
                    onChange={(event) => handleChange('title', event.target.value)}
                    placeholder="e.g. 5 habits that fixed my focus"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="content-platform">Platform</Label>
                    <select
                      id="content-platform"
                      value={form.platform}
                      onChange={(event) => handleChange('platform', event.target.value)}
                      className="flex min-h-11 w-full rounded-md border border-border bg-background/80 px-3 py-2 text-sm text-zinc-900 outline-none focus-visible:ring-2 focus-visible:ring-ring dark:text-zinc-50"
                    >
                      {platforms.map((platform) => (
                        <option key={platform} value={platform}>
                          {platform}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="content-status">Status</Label>
                    <select
                      id="content-status"
                      value={form.status}
                      onChange={(event) => handleChange('status', event.target.value)}
                      className="flex min-h-11 w-full rounded-md border border-border bg-background/80 px-3 py-2 text-sm text-zinc-900 outline-none focus-visible:ring-2 focus-visible:ring-ring dark:text-zinc-50"
                    >
                      {statuses.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <Label htmlFor="content-date">Scheduled Date</Label>
                      <Input
                        id="content-date"
                        type="date"
                        value={form.scheduledDate}
                        className="flex min-h-11 w-full rounded-md border border-border bg-background/80 px-3 py-2 text-sm text-zinc-900 outline-none focus-visible:ring-2 focus-visible:ring-ring dark:text-zinc-50 [&::-webkit-calendar-picker-indicator]:-ml-5 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                        onChange={(event) => handleChange('scheduledDate', event.target.value)}
                      />
                    </div>
                    {form.scheduledDate && (
                      <Button
                        type="button"
                        onClick={() => {
                          setSelectedContentForReminder(selectedIdea || { ...form, _id: 'temp' } as any)
                          setShowReminderModal(true)
                        }}
                        variant="outline"
                        size="sm"
                        className="mt-5 h-11 w-11 flex items-center justify-center text-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/20"
                      >
                        <Bell className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="content-notes">Notes and hook</Label>
                  <textarea
                    id="content-notes"
                    value={form.notes}
                    onChange={(event) => handleChange('notes', event.target.value)}
                    placeholder="Hook, audience, angle, research points..."
                    rows={5}
                    className="w-full rounded-md border border-border bg-background/50 px-3 py-2 text-sm text-zinc-900 outline-none focus-visible:ring-2 focus-visible:ring-ring dark:text-zinc-50"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="content-media">Cloudinary media, video, or document</Label>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
                    <Input
                      id="content-media"
                      value={form.mediaUrl}
                      onChange={(event) => handleChange('mediaUrl', event.target.value)}
                      placeholder="Upload or paste a Cloudinary URL"
                    />
                    <label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md border border-border px-3 text-sm font-medium transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800">
                      <Upload className="h-4 w-4" />
                      Upload
                      <input type="file" className="sr-only" onChange={handleUpload} disabled={uploading} />
                    </label>
                  </div>
                  {form.mediaUrl && (
                    <a
                      href={form.mediaUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-500 hover:underline"
                    >
                      <FileUp className="h-3.5 w-3.5" />
                      Open attached file
                    </a>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="content-script">Script or outline</Label>
                <textarea
                  id="content-script"
                  value={form.script}
                  onChange={(event) => handleChange('script', event.target.value)}
                  placeholder="Write the complete script, shot list, talking points, or publishing checklist..."
                  className="min-h-[24rem] w-full rounded-md border border-border bg-card px-4 py-3 text-sm leading-relaxed text-zinc-900 outline-none focus-visible:ring-2 focus-visible:ring-ring dark:text-zinc-200"
                />
              </div>
            </div>
          </form>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card className="border-border bg-card/30">
          <CardHeader className="border-b border-border/40 pb-2">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-zinc-500">
              Batch Shoot Checklist
            </CardTitle>
            <CardDescription className="text-xs">Select ideas to record in bulk today</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 py-4">
            {batchPlanner.length === 0 ? (
              <p className="py-6 text-center text-xs italic text-zinc-500">Batch checklist is empty.</p>
            ) : (
              batchPlanner.map((id) => {
                const idea = ideas.find((item) => item._id === id)
                if (!idea) return null

                return (
                  <div key={id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3.5">
                    <div className="flex min-w-0 items-center gap-2">
                      {platformIcons[idea.platform]}
                      <span className="truncate text-sm font-bold text-zinc-950 dark:text-zinc-150">{idea.title}</span>
                    </div>
                    <Button onClick={() => handleToggleBatch(id)} variant="ghost" size="sm" className="gap-1 text-rose-500 hover:bg-rose-500/10">
                      <X className="h-3.5 w-3.5" />
                      Remove
                    </Button>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>

        <Card className="border-border bg-card/30">
          <CardHeader className="flex flex-row items-center justify-between border-b border-border/40 pb-2">
            <div>
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-zinc-500">
                Release Calendar
              </CardTitle>
              <CardDescription className="text-xs">Scheduled posting slots</CardDescription>
            </div>
            <CalendarIcon className="h-5 w-5 text-indigo-500" />
          </CardHeader>
          <CardContent className="space-y-2 py-4">
            {scheduledIdeas.length === 0 ? (
              <p className="py-6 text-center text-xs italic text-zinc-500">No posts scheduled.</p>
            ) : (
              scheduledIdeas.map((idea) => (
                <button
                  key={idea._id}
                  type="button"
                  onClick={() => handleSelectIdea(idea)}
                  className="flex w-full items-center justify-between gap-3 rounded-lg border border-border bg-card p-3.5 text-left transition-all hover:border-zinc-300 dark:hover:border-zinc-700"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    {platformIcons[idea.platform]}
                    <span className="truncate text-sm font-bold text-zinc-950 dark:text-zinc-150">{idea.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedContentForReminder(idea)
                        setShowReminderModal(true)
                      }}
                      variant="ghost"
                      size="sm"
                      className="text-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 p-1 h-6 w-6"
                    >
                      <Bell className="h-3.5 w-3.5" />
                    </Button>
                    <span className="shrink-0 text-xs font-bold text-indigo-500">
                      {new Date(idea.scheduledDate!).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                </button>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Content Reminder Modal */}
      <AnimatePresence>
        {showReminderModal && selectedContentForReminder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-lg bg-card border border-border rounded-xl p-6 relative max-h-[90vh] overflow-y-auto">
              <button onClick={() => setShowReminderModal(false)} className="absolute right-4 top-4 text-zinc-400 hover:text-zinc-200"><X className="w-5 h-5" /></button>
              <h3 className="text-lg font-bold mb-2">Set Reminders for {selectedContentForReminder.title}</h3>
              <p className="text-sm text-zinc-500 mb-6">Configure custom reminders for this content</p>

              <ReminderConfigPanel
                configs={selectedContentForReminder.reminderConfigs || []}
                onConfigsChange={(configs) => {
                  setSelectedContentForReminder((prev) => prev ? { ...prev, reminderConfigs: configs } : null)
                }}
                title="Content Reminders"
                description="Set reminder times for this content"
              />

              <div className="mt-6 flex gap-3">
                <Button
                  onClick={async () => {
                    startTransition(async () => {
                      if (!selectedContentForReminder) return
                      const res = await updateContentIdeaAction(selectedContentForReminder._id, {
                        ...selectedContentForReminder,
                        reminderConfigs: selectedContentForReminder.reminderConfigs,
                      })
                      if (res.success) {
                        toast('Reminders updated successfully!', 'success')
                        setIdeas((prev) =>
                          prev.map((idea) =>
                            idea._id === selectedContentForReminder._id
                              ? { ...idea, reminderConfigs: selectedContentForReminder.reminderConfigs }
                              : idea
                          )
                        )
                        if (selectedIdea && selectedIdea._id === selectedContentForReminder._id) {
                          setSelectedIdea({ ...selectedIdea, reminderConfigs: selectedContentForReminder.reminderConfigs })
                        }
                        setShowReminderModal(false)
                      } else {
                        toast(res.error || 'Failed to update reminders', 'error')
                      }
                    })
                  }}
                  variant="primary"
                  className="flex-1"
                  isLoading={isPending}
                >
                  Save Reminders
                </Button>
                <Button
                  onClick={() => setShowReminderModal(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
