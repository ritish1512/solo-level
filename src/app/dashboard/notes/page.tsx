import React from 'react'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/mongodb'
import Note from '@/models/Note'
import NotesClient from './NotesClient'

export const dynamic = 'force-dynamic'

export default async function NotesPage() {
  const session = await getServerSession(authOptions)
  
  if (!session || !session.user) {
    return null
  }

  await dbConnect()

  // Fetch active notes sorted by pinned and updatedAt
  const notes = await Note.find({ 
    user: session.user.id,
    isArchived: false
  }).sort({ isPinned: -1, updatedAt: -1 })

  return <NotesClient initialNotes={JSON.parse(JSON.stringify(notes))} />
}
