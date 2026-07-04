'use server'

import { auth } from '@/lib/auth'
import dbConnect from '@/lib/mongodb'
import Notification from '@/models/Notification'

export interface UserNotification {
  id: string
  title: string
  message: string
  type: 'info' | 'warning' | 'alert' | 'system'
  isRead: boolean
  scheduledFor: string
  createdAt: string
}

async function checkAuth() {
  const session = await auth()
  if (!session || !session.user) {
    throw new Error('Unauthorized. Please log in.')
  }
  return session
}

export async function getUserNotificationsAction(): Promise<UserNotification[]> {
  const session = await checkAuth()
  await dbConnect()

  const notifications = await Notification.find({ user: session.user.id })
    .sort({ scheduledFor: -1, createdAt: -1 })
    .limit(50)
    .lean()

  return notifications.map((notification: any) => ({
    id: notification._id.toString(),
    title: notification.title,
    message: notification.message,
    type: notification.type,
    isRead: notification.isRead,
    scheduledFor: notification.scheduledFor?.toISOString() || '',
    createdAt: notification.createdAt?.toISOString() || '',
  }))
}

export async function markNotificationReadAction(id: string): Promise<{ success: boolean; error?: string }> {
  const session = await checkAuth()
  await dbConnect()

  try {
    const notification = await Notification.findOne({ _id: id, user: session.user.id })
    if (!notification) {
      return { success: false, error: 'Notification not found.' }
    }

    notification.isRead = true
    await notification.save()

    return { success: true }
  } catch (error: any) {
    console.error('Mark notification read error:', error)
    return { success: false, error: error.message || 'Failed to update notification.' }
  }
}
