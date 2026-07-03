'use server'

import mongoose from 'mongoose'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/mongodb'
import ContentIdea, { ContentPlatform, ContentStatus } from '@/models/ContentIdea'

type ContentIdeaPayload = {
  title?: string
  platform?: ContentPlatform
  status?: ContentStatus
  script?: string
  scheduledDate?: string
  notes?: string
  mediaUrl?: string
}

export type ContentIdeaResponse = {
  success: boolean
  message?: string
  error?: string
  idea?: unknown
}

async function checkAuth() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    throw new Error('Unauthorized. Please log in.')
  }
  return session
}

function parseScheduledDate(value?: string) {
  if (!value) return undefined
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? undefined : parsed
}

export async function createContentIdeaAction(data: ContentIdeaPayload): Promise<ContentIdeaResponse> {
  try {
    const session = await checkAuth()
    await dbConnect()

    if (!data.title?.trim()) {
      return { success: false, error: 'Content title is required.' }
    }

    const idea = await ContentIdea.create({
      user: new mongoose.Types.ObjectId(session.user.id),
      title: data.title.trim(),
      platform: data.platform || 'YouTube',
      status: data.status || 'Idea',
      script: data.script,
      scheduledDate: parseScheduledDate(data.scheduledDate),
      notes: data.notes,
      mediaUrl: data.mediaUrl?.trim() || undefined,
    })

    return {
      success: true,
      message: 'Content idea created.',
      idea: JSON.parse(JSON.stringify(idea)),
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create content idea.'
    console.error('Create Content Idea Error:', error)
    return { success: false, error: message }
  }
}

export async function updateContentIdeaAction(id: string, data: ContentIdeaPayload): Promise<ContentIdeaResponse> {
  try {
    const session = await checkAuth()
    await dbConnect()

    const idea = await ContentIdea.findOne({ _id: id, user: session.user.id })
    if (!idea) {
      return { success: false, error: 'Content idea not found.' }
    }

    if (data.title !== undefined) idea.title = data.title.trim()
    if (data.platform !== undefined) idea.platform = data.platform
    if (data.status !== undefined) idea.status = data.status
    if (data.script !== undefined) idea.script = data.script
    if (data.notes !== undefined) idea.notes = data.notes
    if (data.mediaUrl !== undefined) idea.mediaUrl = data.mediaUrl.trim() || undefined
    if (data.scheduledDate !== undefined) idea.scheduledDate = parseScheduledDate(data.scheduledDate)

    if (!idea.title) {
      return { success: false, error: 'Content title is required.' }
    }

    await idea.save()

    return {
      success: true,
      message: 'Content idea updated.',
      idea: JSON.parse(JSON.stringify(idea)),
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update content idea.'
    console.error('Update Content Idea Error:', error)
    return { success: false, error: message }
  }
}

export async function deleteContentIdeaAction(id: string): Promise<ContentIdeaResponse> {
  try {
    const session = await checkAuth()
    await dbConnect()

    await ContentIdea.deleteOne({ _id: id, user: session.user.id })

    return {
      success: true,
      message: 'Content idea deleted.',
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete content idea.'
    console.error('Delete Content Idea Error:', error)
    return { success: false, error: message }
  }
}
