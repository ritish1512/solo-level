'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/mongodb'
import SystemContent from '@/models/SystemContent'
import { logAdminAction } from '@/services/auditLogService'
import { sanityClient } from '@/lib/sanity'

async function checkAdminAuth() {
  const session = await getServerSession(authOptions)
  if (!session || !session.user || session.user.role !== 'admin') {
    throw new Error('Unauthorized: Admin access required')
  }
  return session
}

/**
 * Fetches platform content settings by key.
 */
export async function fetchSystemContent(key: string): Promise<any> {
  await checkAdminAuth()
  await dbConnect()

  const entry = await SystemContent.findOne({ key })
  if (entry) {
    return entry.data
  }

  // Provide initial configuration skeletons if database records do not exist
  if (key === 'seo_metadata') {
    return {
      title: 'Solo Leveling',
      description: 'Your command center for tasks, habits, projects, notes, and productivity.',
      keywords: 'productivity, habits, gamification, developer, solo leveling',
      canonicalUrl: 'https://sololeveling.vercel.app/',
    }
  }

  if (key === 'faqs') {
    return [
      { id: '1', question: 'What is Solo Leveling?', answer: 'It is a gamified productivity system that lets you log tasks, track daily habits, manage projects, and gain levels/XP.' },
    ]
  }

  if (key === 'changelog') {
    return [
      { id: '1', version: 'v1.0.0', date: new Date().toISOString().slice(0, 10), title: 'Grand Launch', description: 'Platform launch containing tasks, habits, leaderboards, and leveling features.' },
    ]
  }

  if (key === 'announcements') {
    return [
      { id: '1', message: 'Welcome to the system dashboard! Complete your tasks to rank up.', active: true },
    ]
  }

  return null
}

/**
 * Updates a content configuration block.
 */
export async function saveSystemContentAction(
  key: string,
  data: any
): Promise<{ success: boolean; error?: string }> {
  const session = await checkAdminAuth()
  await dbConnect()

  try {
    await SystemContent.findOneAndUpdate(
      { key },
      { key, data },
      { upsert: true, new: true }
    )

    await logAdminAction(session.user.id, {
      action: 'UPDATE_SYSTEM_CONTENT',
      target: key,
      collectionName: 'SystemContent',
      details: `Updated configuration settings for: ${key}`,
      result: 'Success',
    })

    return { success: true }
  } catch (error: any) {
    console.error('Save content settings error:', error)
    return { success: false, error: error.message || 'Failed to save content configurations.' }
  }
}

export interface SanityPostSummary {
  _id: string
  title: string
  slug?: string
  publishedAt?: string
}

/**
 * Queries content from Sanity Studio. Safe fallbacks are used.
 */
export async function fetchSanityContent(): Promise<{ posts: SanityPostSummary[]; visionEnabled: boolean }> {
  await checkAdminAuth()

  try {
    // Attempt standard GROQ query
    const posts = await sanityClient.fetch<SanityPostSummary[]>(
      `*[_type == "post"] { _id, title, "slug": slug.current, publishedAt } | order(publishedAt desc)`
    )
    return { posts: posts || [], visionEnabled: true }
  } catch (err) {
    console.warn('Sanity connection failed or unconfigured, returning skeletons:', err)
    return {
      posts: [
        { _id: '1', title: 'Level Up Your Habit Building Routine', publishedAt: new Date().toISOString() },
        { _id: '2', title: 'Why Gamifying Work Increases Daily Completion Rates', publishedAt: new Date().toISOString() },
      ],
      visionEnabled: false,
    }
  }
}
