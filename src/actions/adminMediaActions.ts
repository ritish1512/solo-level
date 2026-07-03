'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/mongodb'
import Task from '@/models/Task'
import Project from '@/models/Project'
import User from '@/models/User'
import { logAdminAction } from '@/services/auditLogService'

async function checkAdminAuth() {
  const session = await getServerSession(authOptions)
  if (!session || !session.user || session.user.role !== 'admin') {
    throw new Error('Unauthorized: Admin access required')
  }
  return session
}

export interface MediaAsset {
  id: string
  name: string
  url: string
  ownerName: string
  ownerEmail: string
  associationType: 'Task' | 'Project'
  associationId: string
  associationTitle: string
  createdAt: string
  fileSizeMb: number
}

/**
 * Extracts and returns all media upload entries from tasks attachments and project screenshots.
 */
export async function fetchAdminMediaAssets(searchQuery?: string): Promise<{
  assets: MediaAsset[]
  stats: {
    totalFiles: number
    totalSizeMb: number
    taskFilesCount: number
    projectFilesCount: number
  }
}> {
  await checkAdminAuth()
  await dbConnect()

  const assets: MediaAsset[] = []

  // 1. Fetch Task attachments
  const tasks = await Task.find({ attachments: { $exists: true, $not: { $size: 0 } } })
    .populate('user', 'name email')
    .select('title attachments user createdAt')

  tasks.forEach((t: any) => {
  if (t.attachments && Array.isArray(t.attachments)) {
    t.attachments.forEach((url: string, idx: number) => {
      const name = url.split('/').pop() || `Task Attachment ${idx + 1}`
        if (!searchQuery || name.toLowerCase().includes(searchQuery.toLowerCase())) {
          assets.push({
            id: `${t._id}-task-${idx}`,
            name,
            url,
            ownerName: t.user?.name || 'Deleted User',
            ownerEmail: t.user?.email || 'Unknown',
            associationType: 'Task',
            associationId: t._id.toString(),
            associationTitle: t.title,
            createdAt: t.createdAt ? t.createdAt.toISOString() : new Date().toISOString(),
            fileSizeMb: 1.25, // Mock estimate
          })
        }
      })
    }
  })

  // 2. Fetch Project screenshots
  const projects = await Project.find({ screenshots: { $exists: true, $not: { $size: 0 } } })
    .populate('user', 'name email')
    .select('title screenshots user createdAt')

  projects.forEach((p: any) => {
    if (p.screenshots && Array.isArray(p.screenshots)) {
      p.screenshots.forEach((url:string, idx:number) => {
        const name = url.split('/').pop() || `Screenshot ${idx + 1}`
        if (!searchQuery || name.toLowerCase().includes(searchQuery.toLowerCase())) {
          assets.push({
            id: `${p._id}-proj-${idx}`,
            name,
            url,
            ownerName: p.user?.name || 'Deleted User',
            ownerEmail: p.user?.email || 'Unknown',
            associationType: 'Project',
            associationId: p._id.toString(),
            associationTitle: p.title,
            createdAt: p.createdAt ? p.createdAt.toISOString() : new Date().toISOString(),
            fileSizeMb: 1.85, // Mock estimate
          })
        }
      })
    }
  })

  const taskFilesCount = assets.filter((a) => a.associationType === 'Task').length
  const projectFilesCount = assets.filter((a) => a.associationType === 'Project').length
  const totalFiles = assets.length
  const totalSizeMb = assets.reduce((sum, a) => sum + a.fileSizeMb, 0)

  return {
    assets,
    stats: {
      totalFiles,
      totalSizeMb: Math.round(totalSizeMb * 100) / 100,
      taskFilesCount,
      projectFilesCount,
    },
  }
}

/**
 * Removes an asset reference from its Task or Project document.
 */
export async function deleteAdminMediaAssetAction(
  url: string,
  associationType: 'Task' | 'Project',
  associationId: string
): Promise<{ success: boolean; error?: string }> {
  const session = await checkAdminAuth()
  await dbConnect()

  try {
    if (associationType === 'Task') {
      await Task.findByIdAndUpdate(associationId, {
        $pull: { attachments: url },
      })
    } else {
      await Project.findByIdAndUpdate(associationId, {
        $pull: { screenshots: url },
      })
    }

    await logAdminAction(session.user.id, {
      action: 'DELETE_MEDIA_ASSET',
      target: associationId,
      collectionName: associationType,
      details: `Deleted reference to file: ${url.split('/').pop()}`,
      result: 'Success',
    })

    return { success: true }
  } catch (error: any) {
    console.error('Delete media asset error:', error)
    return { success: false, error: error.message || 'Failed to remove file reference.' }
  }
}
