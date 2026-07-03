'use server'

import bcrypt from 'bcrypt'
import crypto from 'crypto'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/mongodb'
import User from '@/models/User'
import Task from '@/models/Task'
import Project from '@/models/Project'
import Habit from '@/models/Habit'
import Note from '@/models/Note'
import { logAdminAction } from '@/services/auditLogService'
import { sendVerificationEmail } from '@/services/emailService'

/**
 * Checks if the caller has super admin privileges.
 */
async function checkAdminAuth() {
  const session = await getServerSession(authOptions)
  if (!session || !session.user || session.user.role !== 'admin') {
    throw new Error('Unauthorized: Admin access required')
  }
  return session
}

export interface FetchUsersResult {
  users: Array<{
    id: string
    name: string
    email: string
    role: 'user' | 'admin'
    status: 'active' | 'suspended'
    level: number
    xp: number
    streak: number
    createdAt: string
  }>
  total: number
  pages: number
}

/**
 * Fetches user accounts directory with search, filters, pagination, and sorting.
 */
export async function fetchAdminUsers(options: {
  search?: string
  role?: string
  status?: string
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}): Promise<FetchUsersResult> {
  await checkAdminAuth()
  await dbConnect()

  const page = options.page || 1
  const limit = options.limit || 10
  const skip = (page - 1) * limit
  const sortBy = options.sortBy || 'createdAt'
  const sortOrder = options.sortOrder === 'asc' ? 1 : -1

  const filter: any = {}

  // 1. Search Query
  if (options.search) {
    const searchRegex = new RegExp(options.search, 'i')
    filter.$or = [
      { name: searchRegex },
      { email: searchRegex },
    ]
  }

  // 2. Role Filter
  if (options.role && options.role !== 'all') {
    filter.role = options.role
  }

  // 3. Status Filter
  if (options.status && options.status !== 'all') {
    filter.status = options.status
  }

  const rawUsers = await User.find(filter)
    .sort({ [sortBy]: sortOrder })
    .skip(skip)
    .limit(limit)
    .select('name email role status level xp streak createdAt')

  const total = await User.countDocuments(filter)

  const users = rawUsers.map((u) => ({
    id: u._id.toString(),
    name: u.name,
    email: u.email,
    role: u.role,
    status: u.status || 'active',
    level: u.level,
    xp: u.xp,
    streak: u.streak,
    createdAt: u.createdAt.toISOString(),
  }))

  return {
    users,
    total,
    pages: Math.ceil(total / limit),
  }
}

/**
 * Fetches a single user's detail stats (Task counts, Projects count, Habits count)
 */
export interface UserActivitySummary {
  tasks: { total: number; completed: number; pending: number }
  projects: { total: number }
  habits: { total: number; activeStreak: number }
  notes: { total: number }
}

export async function fetchUserActivitySummary(userId: string): Promise<UserActivitySummary> {
  await checkAdminAuth()
  await dbConnect()

  const [totalTasks, completedTasks, totalProjects, totalHabits, activeStreakHabits, totalNotes] = await Promise.all([
    Task.countDocuments({ user: userId }),
    Task.countDocuments({ user: userId, status: 'Completed' }),
    Project.countDocuments({ user: userId }),
    Habit.countDocuments({ user: userId }),
    Habit.countDocuments({ user: userId, streak: { $gt: 0 } }),
    Note.countDocuments({ user: userId }),
  ])

  return {
    tasks: {
      total: totalTasks,
      completed: completedTasks,
      pending: totalTasks - completedTasks,
    },
    projects: {
      total: totalProjects,
    },
    habits: {
      total: totalHabits,
      activeStreak: activeStreakHabits,
    },
    notes: {
      total: totalNotes,
    },
  }
}

/**
 * Toggles a user's account status between active and suspended.
 */
export async function toggleUserStatusAction(
  userId: string,
  targetStatus: 'active' | 'suspended'
): Promise<{ success: boolean; error?: string }> {
  const session = await checkAdminAuth()
  await dbConnect()

  // Prevent self-suspension
  if (userId === session.user.id) {
    return { success: false, error: 'You cannot suspend your own admin account.' }
  }

  try {
    const user = await User.findById(userId)
    if (!user) {
      return { success: false, error: 'User account not found.' }
    }

    user.status = targetStatus
    await user.save()

    await logAdminAction(session.user.id, {
      action: targetStatus === 'suspended' ? 'SUSPEND_USER' : 'RESTORE_USER',
      target: user._id.toString(),
      collectionName: 'User',
      details: `Status set to ${targetStatus} for user ${user.email}`,
      result: 'Success',
    })

    return { success: true }
  } catch (error: any) {
    console.error('Toggle status error:', error)
    return { success: false, error: error.message || 'Failed to update user status.' }
  }
}

/**
 * Modifies a user's role.
 */
export async function changeUserRoleAction(
  userId: string,
  targetRole: 'user' | 'admin'
): Promise<{ success: boolean; error?: string }> {
  const session = await checkAdminAuth()
  await dbConnect()

  // Prevent self-demotion
  if (userId === session.user.id) {
    return { success: false, error: 'You cannot change your own admin role.' }
  }

  try {
    const user = await User.findById(userId)
    if (!user) {
      return { success: false, error: 'User account not found.' }
    }

    user.role = targetRole
    await user.save()

    await logAdminAction(session.user.id, {
      action: 'CHANGE_USER_ROLE',
      target: user._id.toString(),
      collectionName: 'User',
      details: `Role updated to ${targetRole} for user ${user.email}`,
      result: 'Success',
    })

    return { success: true }
  } catch (error: any) {
    console.error('Change role error:', error)
    return { success: false, error: error.message || 'Failed to update user role.' }
  }
}

/**
 * Resets a user's password to a raw string.
 */
export async function resetUserPasswordAction(
  userId: string,
  passwordText: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  const session = await checkAdminAuth()
  await dbConnect()

  if (!passwordText || passwordText.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters long.' }
  }

  try {
    const user = await User.findById(userId)
    if (!user) {
      return { success: false, error: 'User account not found.' }
    }

    const hashedPassword = await bcrypt.hash(passwordText, 12)
    user.password = hashedPassword
    user.resetPasswordToken = null
    user.resetPasswordTokenExpiry = null
    await user.save()

    await logAdminAction(session.user.id, {
      action: 'RESET_USER_PASSWORD',
      target: user._id.toString(),
      collectionName: 'User',
      details: `Password manually reset for user ${user.email}`,
      result: 'Success',
    })

    return { success: true, message: 'Password reset successfully!' }
  } catch (error: any) {
    console.error('Reset password error:', error)
    return { success: false, error: error.message || 'Failed to reset password.' }
  }
}

/**
 * Triggers dispatch of a verification link.
 */
export async function sendUserVerificationEmailAction(
  userId: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  const session = await checkAdminAuth()
  await dbConnect()

  try {
    const user = await User.findById(userId)
    if (!user) {
      return { success: false, error: 'User account not found.' }
    }

    const verificationToken = crypto.randomBytes(32).toString('hex')
    const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000)

    user.verificationToken = verificationToken
    user.verificationTokenExpiry = verificationTokenExpiry
    await user.save()

    await sendVerificationEmail(user.email, user.name, verificationToken)

    await logAdminAction(session.user.id, {
      action: 'SEND_VERIFICATION_EMAIL',
      target: user._id.toString(),
      collectionName: 'User',
      details: `Verification link sent to user ${user.email}`,
      result: 'Success',
    })

    return { success: true, message: 'Verification email sent successfully!' }
  } catch (error: any) {
    console.error('Send verification link error:', error)
    return { success: false, error: error.message || 'Failed to dispatch verification email.' }
  }
}

/**
 * Permanently deletes a user and associated documents.
 */
export async function deleteUserAction(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const session = await checkAdminAuth()
  await dbConnect()

  // Prevent self-deletion
  if (userId === session.user.id) {
    return { success: false, error: 'You cannot delete your own admin account.' }
  }

  try {
    const user = await User.findById(userId)
    if (!user) {
      return { success: false, error: 'User account not found.' }
    }

    // Delete associated data in parallel
    await Promise.all([
      Task.deleteMany({ user: userId }),
      Project.deleteMany({ user: userId }),
      Habit.deleteMany({ user: userId }),
      Note.deleteMany({ user: userId }),
      User.deleteOne({ _id: userId }),
    ])

    await logAdminAction(session.user.id, {
      action: 'DELETE_USER',
      target: userId,
      collectionName: 'User',
      details: `Permanently deleted user account ${user.email} and all associated items`,
      result: 'Success',
    })

    return { success: true }
  } catch (error: any) {
    console.error('Delete user error:', error)
    return { success: false, error: error.message || 'Failed to delete user account.' }
  }
}
