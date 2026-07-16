import React from 'react'
import { auth } from '@/lib/auth'
import dbConnect from '@/lib/mongodb'
import Note from '@/models/Note'
import NotesClient from './NotesClient'
import { verifyFeature } from '@/lib/checkFeature'

export const dynamic = 'force-dynamic'

export default async function NotesPage() {
  await verifyFeature('notes')
  
  const session = await auth()
  
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
