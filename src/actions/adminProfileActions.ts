'use server'

import bcrypt from 'bcrypt'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/mongodb'
import User from '@/models/User'
import AuditLog from '@/models/AuditLog'
import { logAdminAction } from '@/services/auditLogService'

async function checkAdminAuth() {
  const session = await getServerSession(authOptions)
  if (!session || !session.user || session.user.role !== 'admin') {
    throw new Error('Unauthorized: Admin access required')
  }
  return session
}

export interface AdminActivityItem {
  id: string
  action: string
  details?: string
  result: string
  timestamp: string
  ipAddress?: string
}

/**
 * Retrieves the profile details of the currently logged in administrator.
 */
export async function fetchAdminProfileDetails() {
  const session = await checkAdminAuth()
  await dbConnect()

  const user = await User.findById(session.user.id).select(
    'name email image role createdAt lastActive'
  )

  if (!user) {
    throw new Error('User not found')
  }

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    image: user.image || '',
    role: user.role,
    createdAt: user.createdAt.toISOString(),
    lastActive: user.lastActive ? user.lastActive.toISOString() : undefined,
  }
}

/**
 * Updates the admin profile details.
 */
export async function updateAdminProfileDetailsAction(data: {
  name: string
  email: string
  image?: string
}): Promise<{ success: boolean; error?: string }> {
  const session = await checkAdminAuth()
  await dbConnect()

  try {
    const user = await User.findById(session.user.id)
    if (!user) {
      return { success: false, error: 'Account not found.' }
    }

    user.name = data.name
    user.email = data.email.toLowerCase()
    if (data.image !== undefined) {
      user.image = data.image
    }
    await user.save()

    await logAdminAction(session.user.id, {
      action: 'UPDATE_ADMIN_PROFILE',
      target: session.user.id,
      collectionName: 'User',
      details: 'Updated personal profile details',
      result: 'Success',
    })

    return { success: true }
  } catch (error: any) {
    console.error('Update profile error:', error)
    return { success: false, error: error.message || 'Failed to update profile.' }
  }
}

/**
 * Updates the admin password.
 */
export async function updateAdminPasswordAction(options: {
  currentPassword?: string
  newPassword?: string
}): Promise<{ success: boolean; error?: string }> {
  const session = await checkAdminAuth()
  await dbConnect()

  if (!options.newPassword || options.newPassword.length < 6) {
    return { success: false, error: 'New password must be at least 6 characters long.' }
  }

  try {
    const user = await User.findById(session.user.id)
    if (!user) {
      return { success: false, error: 'Account not found.' }
    }

    // Verify current password if user has one set
    if (user.password && options.currentPassword) {
      const isMatch = await bcrypt.compare(options.currentPassword, user.password)
      if (!isMatch) {
        return { success: false, error: 'Incorrect current password.' }
      }
    }

    const hashedPassword = await bcrypt.hash(options.newPassword, 12)
    user.password = hashedPassword
    await user.save()

    await logAdminAction(session.user.id, {
      action: 'UPDATE_ADMIN_PASSWORD',
      target: session.user.id,
      collectionName: 'User',
      details: 'Updated personal account password',
      result: 'Success',
    })

    return { success: true }
  } catch (error: any) {
    console.error('Update password error:', error)
    return { success: false, error: error.message || 'Failed to update password.' }
  }
}

/**
 * Queries AuditLogs for actions committed by the current admin.
 */
export async function fetchAdminPersonalHistory(): Promise<AdminActivityItem[]> {
  const session = await checkAdminAuth()
  await dbConnect()

  const rawLogs = await AuditLog.find({ admin: session.user.id })
    .sort({ createdAt: -1 })
    .limit(10)
    .exec()

  return rawLogs.map((l: any) => ({
    id: l._id.toString(),
    action: l.action,
    details: l.details,
    result: l.result,
    timestamp: l.createdAt.toISOString(),
    ipAddress: l.ipAddress,
  }))
}
