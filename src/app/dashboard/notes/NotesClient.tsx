'use client'

import React, { useState, useTransition, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Plus, 
  Search, 
  Pin, 
  Archive, 
  Trash2, 
  Eye, 
  Edit3, 
  Save, 
  Tag, 
  Check,
  FolderOpen
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { useToast } from '@/components/ui/Toast'
import { 
  createNoteAction, 
  updateNoteAction, 
  toggleNotePinAction, 
  toggleNoteArchiveAction,
  deleteNoteAction
} from '@/actions/noteActions'

interface NotesClientProps {
  initialNotes: any[]
}

// Simple lightweight Markdown to HTML regex parser
function parseMarkdownToHtml(markdown: string): string {
  if (!markdown) return '<p class="text-zinc-500 italic">No content. Start writing...</p>'
  
  let html = markdown
    // Escape HTML special chars first
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  // Headers
  html = html.replace(/^### (.*$)/gim, '<h4 class="text-sm font-bold mt-4 mb-2 text-zinc-900 dark:text-white">$1</h4>')
  html = html.replace(/^## (.*$)/gim, '<h3 class="text-base font-bold mt-4 mb-2 text-zinc-900 dark:text-white">$1</h3>')
  html = html.replace(/^# (.*$)/gim, '<h2 class="text-lg font-extrabold mt-5 mb-3 text-indigo-500">$1</h2>')

  // Fenced code blocks
  html = html.replace(/```([\s\S]*?)```/gm, '<pre class="bg-zinc-100 dark:bg-zinc-950 p-3 rounded-lg border border-border/40 font-mono text-xs overflow-x-auto my-3 text-zinc-800 dark:text-zinc-300">$1</pre>')

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="bg-zinc-100 dark:bg-zinc-900 px-1 py-0.5 rounded font-mono text-xs text-indigo-500 font-bold">$1</code>')

  // Bold & Italics
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-extrabold text-zinc-900 dark:text-white">$1</strong>')
  html = html.replace(/\*([^*]+)\*/g, '<em class="italic">$1</em>')

  // Bullet Lists
  html = html.replace(/^\s*-\s+(.*$)/gim, '<li class="list-disc ml-5 my-1 text-zinc-700 dark:text-zinc-300">$1</li>')

  // Paragraph breaks
  html = html.replace(/^\s*(?!<h|<pre|<li|<code|<strong|<em)(.+)$/gim, '<p class="text-sm leading-relaxed my-2 text-zinc-700 dark:text-zinc-300">$1</p>')

  return html
}

export default function NotesClient({ initialNotes }: NotesClientProps) {
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()

  // State
  const [notes, setNotes] = useState<any[]>(initialNotes)
  const [selectedNote, setSelectedNote] = useState<any | null>(initialNotes[0] || null)
  
  // Note Form Fields
  const [noteTitle, setNoteTitle] = useState('')
  const [noteContent, setNoteContent] = useState('')
  const [noteTags, setNoteTags] = useState('')

  // UI States
  const [searchQuery, setSearchQuery] = useState('')
  const [newNoteTitle, setNewNoteTitle] = useState('')
  const [editorMode, setEditorMode] = useState<'edit' | 'preview'>('edit')
  const [showArchive, setShowArchive] = useState(false)

  // Update editor inputs when note selection changes
  useEffect(() => {
    if (selectedNote) {
      setNoteTitle(selectedNote.title)
      setNoteContent(selectedNote.content || '')
      setNoteTags(selectedNote.tags?.join(', ') || '')
      setEditorMode('edit')
    } else {
      setNoteTitle('')
      setNoteContent('')
      setNoteTags('')
    }
  }, [selectedNote])

  // --- ACTIONS ---
  const handleCreateNote = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newNoteTitle.trim()) return

    startTransition(async () => {
      const res = await createNoteAction(newNoteTitle)
      if (res.success) {
        toast('Note created!', 'success')
        setNotes((prev) => [res.note, ...prev])
        setSelectedNote(res.note)
        setNewNoteTitle('')
      } else {
        toast(res.error || 'Failed to create note', 'error')
      }
    })
  }

  const handleSaveNote = () => {
    if (!selectedNote) return

    startTransition(async () => {
      const res = await updateNoteAction(selectedNote._id, {
        title: noteTitle,
        content: noteContent,
        tags: noteTags,
      })

      if (res.success) {
        toast('Changes saved successfully.', 'success')
        // Refresh local array
        setNotes((prev) =>
          prev.map((n) => (n._id === selectedNote._id ? res.note : n))
        )
        setSelectedNote(res.note)
      } else {
        toast(res.error || 'Failed to save note', 'error')
      }
    })
  }

  const handleTogglePin = (id: string) => {
    startTransition(async () => {
      const res = await toggleNotePinAction(id)
      if (res.success) {
        toast(res.message || 'Updated pin', 'success')
        setNotes((prev) => {
          const updated = prev.map((n) => (n._id === id ? res.note : n))
          // Keep pinned notes at the top
          return updated.sort((a, b) => {
            if (a.isPinned && !b.isPinned) return -1
            if (!a.isPinned && b.isPinned) return 1
            return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          })
        })
        if (selectedNote?._id === id) {
          setSelectedNote(res.note)
        }
      } else {
        toast(res.error || 'Failed to update pin', 'error')
      }
    })
  }

  const handleToggleArchive = (id: string) => {
    startTransition(async () => {
      const res = await toggleNoteArchiveAction(id)
      if (res.success) {
        toast(res.message || 'Updated archive state', 'info')
        // Remove from current active sidebar listing
        const remaining = notes.filter((n) => n._id !== id)
        setNotes(remaining)
        setSelectedNote(remaining[0] || null)
      } else {
        toast(res.error || 'Failed to archive note', 'error')
      }
    })
  }

  const handleDeletePermanent = (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this note? This action is irreversible.')) return

    startTransition(async () => {
      const res = await deleteNoteAction(id)
      if (res.success) {
        toast(res.message || 'Note deleted permanently.', 'info')
        const remaining = notes.filter((n) => n._id !== id)
        setNotes(remaining)
        setSelectedNote(remaining[0] || null)
      } else {
        toast(res.error || 'Failed to delete note', 'error')
      }
    })
  }

  // Filter notes based on search & archive mode
  const filteredNotes = notes.filter((n) => {
    const matchesSearch = n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          n.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          n.tags?.some((t: string) => t.toLowerCase().includes(searchQuery.toLowerCase()))
    
    // In our server actions we fetch active/archived list depending on page, but we also filter locally here
    return matchesSearch
  })

  // Load archived list
  const handleToggleArchiveFilter = () => {
    const nextState = !showArchive
    setShowArchive(nextState)
    
    // Fetch list dynamically from DB
    startTransition(async () => {
      const res = nextState 
        ? await fetch('/api/user/profile') // In Phase 3, we write action fetcher
        : await fetch('/api/user/profile') 
      
      // Call corresponding note retrieval action
      const noteLoader = nextState 
        ? await import('@/actions/noteActions').then((m) => m.getArchivedNotesAction())
        : await import('@/actions/noteActions').then((m) => m.getNotesAction())

      if (noteLoader.success) {
        setNotes(noteLoader.notes || [])
        setSelectedNote(noteLoader.notes?.[0] || null)
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-white">Markdown Notes</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1 text-sm font-medium">Capture thoughts and format codebase guides in rich text</p>
        </div>
        
        {/* Toggle archive filter */}
        <Button 
          onClick={handleToggleArchiveFilter} 
          variant={showArchive ? 'primary' : 'outline'} 
          size="sm"
          className="gap-1.5 h-8.5 cursor-pointer"
        >
          <FolderOpen className="w-4 h-4" /> {showArchive ? 'Active Notes' : 'Archive Repository'}
        </Button>
      </div>

      {/* Dual Pane Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-stretch h-[calc(100vh-210px)] min-h-[500px]">
        
        {/* Left Pane: Notes listing & Search */}
        <div className="lg:col-span-1 border border-border bg-card/25 rounded-xl p-4 flex flex-col justify-between space-y-4 overflow-hidden h-full">
          <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-zinc-400" />
              <Input
                placeholder="Search notes / tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9.5 bg-background/50 border-border"
              />
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {filteredNotes.length === 0 ? (
                <p className="text-center text-xs text-zinc-500 italic py-16">No notes found.</p>
              ) : (
                filteredNotes.map((n) => {
                  const isSelected = selectedNote && selectedNote._id === n._id
                  return (
                    <div
                      key={n._id}
                      onClick={() => setSelectedNote(n)}
                      className={`group p-3.5 rounded-lg border text-left cursor-pointer transition-all flex justify-between items-start gap-2 ${
                        isSelected
                          ? 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20 shadow-sm'
                          : 'bg-card border-border hover:border-zinc-300 dark:hover:border-zinc-700'
                      }`}
                    >
                      <div className="space-y-1 truncate flex-1">
                        <div className="flex items-center gap-1.5 truncate">
                          {n.isPinned && <Pin className="w-3 h-3 text-indigo-500 fill-current flex-shrink-0" />}
                          <span className="font-semibold text-sm truncate">{n.title}</span>
                        </div>
                        <p className="text-[10px] text-zinc-400 truncate">
                          {n.content ? n.content.slice(0, 45) : 'Empty note'}
                        </p>
                      </div>

                      {/* Side quick icons */}
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleTogglePin(n._id) }}
                          className="p-1 hover:bg-indigo-500/10 text-zinc-400 hover:text-indigo-500 rounded"
                          title="Pin note"
                        >
                          <Pin className={`w-3.5 h-3.5 ${n.isPinned ? 'fill-current text-indigo-500' : ''}`} />
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* New Note Form at bottom */}
          <form onSubmit={handleCreateNote} className="border-t border-border/40 pt-4 flex gap-1.5">
            <Input
              placeholder="New note title..."
              value={newNoteTitle}
              onChange={(e) => setNewNoteTitle(e.target.value)}
              className="h-9 bg-background/50 text-xs border-border"
              required
            />
            <Button type="submit" variant="outline" className="p-2 h-9 cursor-pointer" disabled={isPending}>
              <Plus className="w-4 h-4" />
            </Button>
          </form>
        </div>

        {/* Right Pane: Markdown Text editor & Preview */}
        <div className="lg:col-span-3 border border-border bg-card/25 rounded-xl flex flex-col overflow-hidden h-dvh">
          {selectedNote ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              
              {/* Note Header Details */}
              <div className="p-4 border-b border-border/40 flex flex-wrap gap-4 items-center justify-between bg-card/40 backdrop-blur-md">
                
                {/* Title & tags inputs */}
                <div className="flex-1 min-w-[200px] space-y-2">
                  <input
                    type="text"
                    value={noteTitle}
                    onChange={(e) => setNoteTitle(e.target.value)}
                    className="w-full bg-transparent font-bold text-lg text-zinc-950 dark:text-white outline-none focus:border-b border-indigo-500/50 pb-0.5"
                    placeholder="Note Title"
                  />
                  <div className="flex items-center gap-1.5 text-zinc-400">
                    <Tag className="w-3.5 h-3.5" />
                    <input
                      type="text"
                      value={noteTags}
                      onChange={(e) => setNoteTags(e.target.value)}
                      className="bg-transparent text-xs text-zinc-500 dark:text-zinc-400 outline-none w-full"
                      placeholder="comma, separated, tags"
                    />
                  </div>
                </div>

                {/* Toolbar */}
                <div className="flex items-center gap-2">
                  {/* Pin */}
                  <Button
                    onClick={() => handleTogglePin(selectedNote._id)}
                    variant={selectedNote.isPinned ? 'primary' : 'outline'}
                    size="sm"
                    className="p-2 h-8.5"
                    title="Pin Note"
                  >
                    <Pin className={`w-4 h-4 ${selectedNote.isPinned ? 'fill-current' : ''}`} />
                  </Button>

                  {/* Archive */}
                  <Button
                    onClick={() => handleToggleArchive(selectedNote._id)}
                    variant="outline"
                    size="sm"
                    className="p-2 h-8.5 hover:bg-amber-500/10 hover:text-amber-500"
                    title="Archive Note"
                  >
                    <Archive className="w-4 h-4" />
                  </Button>

                  {/* Save */}
                  <Button
                    onClick={handleSaveNote}
                    variant="primary"
                    size="sm"
                    className="gap-1.5 h-8.5 cursor-pointer"
                    isLoading={isPending}
                  >
                    <Save className="w-4 h-4" /> Save
                  </Button>

                  {/* Delete permanently */}
                  <Button
                    onClick={() => handleDeletePermanent(selectedNote._id)}
                    variant="ghost"
                    size="sm"
                    className="p-2 text-rose-500 hover:bg-rose-500/10 h-8.5"
                    title="Delete Permanently"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

              </div>

              {/* Edit vs Preview Tab controller */}
              <div className="px-4 border-b border-border/20 flex gap-2 bg-zinc-50/50 dark:bg-zinc-950/10">
                <button
                  onClick={() => setEditorMode('edit')}
                  className={`px-3 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                    editorMode === 'edit'
                      ? 'border-indigo-500 text-indigo-500'
                      : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-800'
                  }`}
                >
                  <span className="flex items-center gap-1.5"><Edit3 className="w-3.5 h-3.5" /> Markdown Editor</span>
                </button>
                <button
                  onClick={() => setEditorMode('preview')}
                  className={`px-3 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                    editorMode === 'preview'
                      ? 'border-indigo-500 text-indigo-500'
                      : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-800'
                  }`}
                >
                  <span className="flex items-center gap-1.5"><Eye className="w-3.5 h-3.5" /> Styled Preview</span>
                </button>
              </div>

              {/* Editor Workspace Panel */}
              <div className="flex-1 overflow-hidden p-4 bg-background/30">
                {editorMode === 'edit' ? (
                  <textarea
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    className="w-full h-full bg-transparent outline-none resize-none font-mono text-sm leading-relaxed text-zinc-900 dark:text-zinc-200"
                    placeholder="Write your markdown outline here (Use # Header, **Bold**, - Bullet, ```code```)..."
                  />
                ) : (
                  <div 
                    className="w-full h-full overflow-y-auto pr-1"
                    dangerouslySetInnerHTML={{ __html: parseMarkdownToHtml(noteContent) }}
                  />
                )}
              </div>

            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center italic text-zinc-500 text-sm">
              Create a note or select one from the directory to start writing.
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
