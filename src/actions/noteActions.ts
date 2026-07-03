'use server'

import mongoose from 'mongoose'
import { auth } from '@/lib/auth'
import dbConnect from '@/lib/mongodb'
import Note from '@/models/Note'

export interface NoteResponse {
  success: boolean
  message?: string
  error?: string
  note?: any
  notes?: any[]
}

// Session authentication check
async function checkAuth() {
  const session = await auth()
  if (!session || !session.user) {
    throw new Error('Unauthorized. Please log in.')
  }
  return session
}

export async function createNoteAction(title: string): Promise<NoteResponse> {
  try {
    const session = await checkAuth()
    
    if (!title || title.trim() === '') {
      return { success: false, error: 'Note title is required.' }
    }

    await dbConnect()

    const newNote = await Note.create({
      user: new mongoose.Types.ObjectId(session.user.id),
      title: title.trim(),
      content: '',
      tags: [],
      isPinned: false,
      isArchived: false,
    })

    return {
      success: true,
      message: 'Note created!',
      note: JSON.parse(JSON.stringify(newNote)),
    }
  } catch (error: any) {
    console.error('Create Note Error:', error)
    return { success: false, error: error.message || 'Failed to create note.' }
  }
}

export async function getNotesAction(): Promise<NoteResponse> {
  try {
    const session = await checkAuth()
    await dbConnect()

    const notes = await Note.find({ 
      user: session.user.id,
      isArchived: false 
    }).sort({ isPinned: -1, updatedAt: -1 })

    return {
      success: true,
      notes: JSON.parse(JSON.stringify(notes)),
    }
  } catch (error: any) {
    console.error('Get Notes Error:', error)
    return { success: false, error: error.message || 'Failed to fetch notes.' }
  }
}

export async function getArchivedNotesAction(): Promise<NoteResponse> {
  try {
    const session = await checkAuth()
    await dbConnect()

    const notes = await Note.find({ 
      user: session.user.id,
      isArchived: true 
    }).sort({ updatedAt: -1 })

    return {
      success: true,
      notes: JSON.parse(JSON.stringify(notes)),
    }
  } catch (error: any) {
    console.error('Get Archived Notes Error:', error)
    return { success: false, error: error.message || 'Failed to fetch archived notes.' }
  }
}

export async function updateNoteAction(id: string, data: any): Promise<NoteResponse> {
  try {
    const session = await checkAuth()
    await dbConnect()

    const note = await Note.findOne({ _id: id, user: session.user.id })
    if (!note) {
      return { success: false, error: 'Note not found.' }
    }

    const { title, content, tags } = data

    note.title = title || note.title
    if (content !== undefined) note.content = content
    if (tags !== undefined) {
      note.tags = Array.isArray(tags)
        ? tags
        : tags.split(',').map((t: string) => t.trim()).filter((t: string) => t !== '')
    }

    await note.save()

    return {
      success: true,
      message: 'Note saved!',
      note: JSON.parse(JSON.stringify(note)),
    }
  } catch (error: any) {
    console.error('Update Note Error:', error)
    return { success: false, error: error.message || 'Failed to save note.' }
  }
}

export async function toggleNotePinAction(id: string): Promise<NoteResponse> {
  try {
    const session = await checkAuth()
    await dbConnect()

    const note = await Note.findOne({ _id: id, user: session.user.id })
    if (!note) {
      return { success: false, error: 'Note not found.' }
    }

    note.isPinned = !note.isPinned
    await note.save()

    return {
      success: true,
      message: note.isPinned ? 'Note pinned!' : 'Note unpinned.',
      note: JSON.parse(JSON.stringify(note)),
    }
  } catch (error: any) {
    console.error('Toggle Pin Error:', error)
    return { success: false, error: error.message || 'Failed to pin/unpin note.' }
  }
}

export async function toggleNoteArchiveAction(id: string): Promise<NoteResponse> {
  try {
    const session = await checkAuth()
    await dbConnect()

    const note = await Note.findOne({ _id: id, user: session.user.id })
    if (!note) {
      return { success: false, error: 'Note not found.' }
    }

    note.isArchived = !note.isArchived
    
    // If archiving, unpin
    if (note.isArchived) {
      note.isPinned = false
    }

    await note.save()

    return {
      success: true,
      message: note.isArchived ? 'Note archived.' : 'Note unarchived.',
      note: JSON.parse(JSON.stringify(note)),
    }
  } catch (error: any) {
    console.error('Toggle Archive Error:', error)
    return { success: false, error: error.message || 'Failed to archive/unarchive note.' }
  }
}

export async function deleteNoteAction(id: string): Promise<NoteResponse> {
  try {
    const session = await checkAuth()
    await dbConnect()

    await Note.deleteOne({ _id: id, user: session.user.id })

    return {
      success: true,
      message: 'Note deleted permanently.',
    }
  } catch (error: any) {
    console.error('Delete Note Error:', error)
    return { success: false, error: error.message || 'Failed to delete note.' }
  }
}
