'use server'

import mongoose from 'mongoose'
import { auth } from '@/lib/auth'
import dbConnect from '@/lib/mongodb'
import ContentIdea, { ContentPlatform, ContentStatus } from '@/models/ContentIdea'
import { createContentReminders, deleteContentReminders, generateAutoReminders } from '@/services/reminderService'

type ContentIdeaPayload = {
  title?: string
  platform?: ContentPlatform
  status?: ContentStatus
  script?: string
  scheduledDate?: string
  notes?: string
  mediaUrl?: string
  reminderConfigs?: any[]
}

export type ContentIdeaResponse = {
  success: boolean
  message?: string
  error?: string
  idea?: unknown
}

async function checkAuth() {
  const session = await auth()
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

    const scheduledDate = parseScheduledDate(data.scheduledDate)
    const idea = await ContentIdea.create({
      user: new mongoose.Types.ObjectId(session.user.id),
      title: data.title.trim(),
      platform: data.platform || 'YouTube',
      status: data.status || 'Idea',
      script: data.script,
      scheduledDate,
      notes: data.notes,
      mediaUrl: data.mediaUrl?.trim() || undefined,
      reminderConfigs: data.reminderConfigs || [],
    })

    // Generate automatic reminders if scheduled date is provided and no custom reminder configs were supplied
    if (scheduledDate && (!data.reminderConfigs || data.reminderConfigs.length === 0)) {
      const autoReminders = generateAutoReminders(scheduledDate, 'assignment') // Use 'assignment' type for content
      if (autoReminders.length > 0) {
        await createContentReminders(idea._id.toString(), autoReminders)
      }
    }

    // Create reminder documents if custom reminder configs provided
    if (idea.scheduledDate && data.reminderConfigs && data.reminderConfigs.length > 0) {
      // Convert reminderTime strings to Date objects
      const configsForService = data.reminderConfigs.map((config: any) => ({
        ...config,
        reminderTime: new Date(config.reminderTime),
      }))
      await createContentReminders(idea._id.toString(), configsForService)
    }

    return {
      success: true,
      message: 'Content idea created! You\'ll receive automatic reminders 1 week before, 1 day before, and on the scheduled date.',
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
    if (data.reminderConfigs !== undefined) idea.reminderConfigs = data.reminderConfigs

    if (!idea.title) {
      return { success: false, error: 'Content title is required.' }
    }

    await idea.save()

    // Update reminders if scheduled date or reminder configs changed
    if (data.scheduledDate !== undefined || data.reminderConfigs !== undefined) {
      await deleteContentReminders(id)
      if (idea.scheduledDate) {
        if (idea.reminderConfigs && idea.reminderConfigs.length > 0) {
          // Convert reminderTime strings to Date objects
          const configsForService = idea.reminderConfigs.map((config: any) => ({
            ...config,
            reminderTime: new Date(config.reminderTime),
          }))
          await createContentReminders(id, configsForService)
        } else {
          const autoReminders = generateAutoReminders(idea.scheduledDate, 'assignment')
          if (autoReminders.length > 0) {
            await createContentReminders(id, autoReminders)
          }
        }
      }
    }

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

    // Delete associated reminders
    await deleteContentReminders(id)

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
