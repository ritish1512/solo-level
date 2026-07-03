'use server'

import { auth } from '@/lib/auth'
import dbConnect from '@/lib/mongodb'
import Notification from '@/models/Notification'
import User from '@/models/User'
import { logAdminAction } from '@/services/auditLogService'

async function checkAdminAuth() {
  const session = await auth()
  if (!session || !session.user || session.user.role !== 'admin') {
    throw new Error('Unauthorized: Admin access required')
  }
  return session
}

export interface NotificationLog {
  id: string
  title: string
  message: string
  type: 'info' | 'warning' | 'alert' | 'system'
  recipientName: string
  recipientEmail: string
  scheduledFor: string
  isRead: boolean
}

/**
 * Queries recently created or scheduled notifications.
 */
export async function fetchAdminNotifications(): Promise<NotificationLog[]> {
  await checkAdminAuth()
  await dbConnect()

  const rawNotifications = await Notification.find()
    .sort({ createdAt: -1 })
    .limit(20)
    .populate('user', 'name email')
    .exec()

  return rawNotifications.map((n: any) => ({
    id: n._id.toString(),
    title: n.title,
    message: n.message,
    type: n.type,
    recipientName: n.user?.name || 'Global Broadcast',
    recipientEmail: n.user?.email || 'All Users',
    scheduledFor: n.scheduledFor.toISOString(),
    isRead: n.isRead,
  }))
}

/**
 * Creates in-app notifications targeting specific cohorts or individuals.
 */
export async function createNotificationAction(options: {
  title: string
  message: string
  type: 'info' | 'warning' | 'alert' | 'system'
  recipientGroup: 'all' | 'admins' | 'users' | string // Specific User ID or Group
  scheduledFor?: string
}): Promise<{ success: boolean; count?: number; error?: string }> {
  const session = await checkAdminAuth()
  await dbConnect()

  const scheduleDate = options.scheduledFor ? new Date(options.scheduledFor) : new Date()

  try {
    let targetUserIds: string[] = []

    if (
      options.recipientGroup === 'all' ||
      options.recipientGroup === 'admins' ||
      options.recipientGroup === 'users'
    ) {
      const query: any = { status: { $ne: 'suspended' } }
      if (options.recipientGroup === 'admins') {
        query.role = 'admin'
      } else if (options.recipientGroup === 'users') {
        query.role = 'user'
      }

      const users = await User.find(query).select('_id')
      targetUserIds = users.map((u) => u._id.toString())
    } else {
      // Validate individual user ID
      const userExists = await User.exists({ _id: options.recipientGroup })
      if (!userExists) {
        return { success: false, error: 'Target user account not found.' }
      }
      targetUserIds = [options.recipientGroup]
    }

    if (targetUserIds.length === 0) {
      return { success: false, error: 'No active accounts found in the selected cohort.' }
    }

    // Compose notification records
    const notificationDocs = targetUserIds.map((userId) => ({
      user: userId,
      title: options.title,
      message: options.message,
      type: options.type,
      scheduledFor: scheduleDate,
      isRead: false,
    }))

    await Notification.insertMany(notificationDocs)

    await logAdminAction(session.user.id, {
      action: 'CREATE_SYSTEM_NOTIFICATION',
      collectionName: 'Notification',
      details: `Created in-app notification: "${options.title}" to ${notificationDocs.length} users in group: ${options.recipientGroup}`,
      result: 'Success',
    })

    return { success: true, count: notificationDocs.length }
  } catch (error: any) {
    console.error('Create notification error:', error)
    return { success: false, error: error.message || 'Failed to dispatch notification.' }
  }
}

/**
 * Removes a notification record.
 */
export async function deleteNotificationAction(
  notificationId: string
): Promise<{ success: boolean; error?: string }> {
  const session = await checkAdminAuth()
  await dbConnect()

  try {
    const deleted = await Notification.findByIdAndDelete(notificationId)
    if (!deleted) {
      return { success: false, error: 'Notification record not found.' }
    }

    await logAdminAction(session.user.id, {
      action: 'DELETE_SYSTEM_NOTIFICATION',
      target: notificationId,
      collectionName: 'Notification',
      details: `Deleted notification: "${deleted.title}"`,
      result: 'Success',
    })

    return { success: true }
  } catch (error: any) {
    console.error('Delete notification error:', error)
    return { success: false, error: error.message || 'Failed to remove notification.' }
  }
}
