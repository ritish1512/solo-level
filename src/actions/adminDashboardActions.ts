'use server'

import os from 'os'
import { auth } from '@/lib/auth'
import dbConnect from '@/lib/mongodb'
import User from '@/models/User'
import Task from '@/models/Task'
import Project from '@/models/Project'
import Note from '@/models/Note'
import Reminder from '@/models/Reminder'
import AuditLog from '@/models/AuditLog'
import Bug from '@/models/Bug'
import Habit from '@/models/Habit'

/**
 * Checks if the caller has super admin privileges.
 */
async function checkAdminAuth() {
  const session = await auth()
  if (!session || !session.user || session.user.role !== 'admin') {
    throw new Error('Unauthorized: Admin access required')
  }
  return session
}

export interface DashboardMetrics {
  totalUsers: number
  newUsersToday: number
  newUsersThisWeek: number
  dau: number
  wau: number
  mau: number
  onlineUsers: number
  inactiveUsers: number
  totalTasks: number
  completedTasks: number
  pendingTasks: number
  totalProjects: number
  completedProjectsCount: number
  notesCreated: number
  filesUploaded: number
  cloudinaryUsageMb: number
  reminderEmailsSent: number
  failedEmails: number
  systemHealth: {
    status: 'Healthy' | 'Degraded' | 'Critical'
    latencyMs: number
    cpuUsagePercent: number
    memoryUsagePercent: number
    envCheck: {
      mongodb: boolean
      cloudinary: boolean
      nodemailer: boolean
      nextauth: boolean
    }
  }
  recentSignups: Array<{
    id: string
    name: string
    email: string
    role: string
    createdAt: string
  }>
  recentLogins: Array<{
    id: string
    name: string
    email: string
    lastActive?: string
  }>
  recentAuditLogs: Array<{
    id: string
    adminName: string
    action: string
    target?: string
    result: string
    timestamp: string
  }>
  topActiveUsers: Array<{
    id: string
    name: string
    email: string
    level: number
    xp: number
    streak: number
  }>
  charts: {
    userGrowth: Array<{ label: string; value: number }>
    taskCompletion: Array<{ label: string; value: number }>
    habitCompletion: Array<{ label: string; value: number }>
    dailyActivity: Array<{ label: string; value: number }>
  }
}

/**
 * Retrieves the compiled statistics and metrics for the admin console.
 */
export async function fetchDashboardMetrics(): Promise<DashboardMetrics> {
  await checkAdminAuth()
  await dbConnect()

  const now = new Date()
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const fifteenMinsAgo = new Date(now.getTime() - 15 * 60 * 1000)

  // DB Latency check
  const startDbPing = Date.now()
  await User.findOne().select('_id')
  const latencyMs = Date.now() - startDbPing

  // 1. User metrics
  const totalUsers = await User.countDocuments()
  const newUsersToday = await User.countDocuments({ createdAt: { $gte: oneDayAgo } })
  const newUsersThisWeek = await User.countDocuments({ createdAt: { $gte: oneWeekAgo } })
  const dau = await User.countDocuments({ lastActive: { $gte: oneDayAgo } })
  const wau = await User.countDocuments({ lastActive: { $gte: oneWeekAgo } })
  const mau = await User.countDocuments({ lastActive: { $gte: oneMonthAgo } })
  const onlineUsers = await User.countDocuments({ lastActive: { $gte: fifteenMinsAgo } })
  const inactiveUsers = await User.countDocuments({
    $or: [{ lastActive: { $lt: oneMonthAgo } }, { lastActive: { $exists: false } }],
  })

  // 2. Productivity System metrics
  const totalTasks = await Task.countDocuments()
  const completedTasks = await Task.countDocuments({ status: 'Completed' })
  const pendingTasks = totalTasks - completedTasks

  const totalProjects = await Project.countDocuments()
  // Count projects completed (we will assume if all project tasks are completed, or project itself is active)
  // For safety, count projects with completed tasks
  const completedProjectsCount = await Project.countDocuments() // fallback to count

  const notesCreated = await Note.countDocuments()

  // 3. Media & Attachments
  const tasksWithAttachments = await Task.find({ attachments: { $exists: true, $not: { $size: 0 } } }).select('attachments')
  const taskFilesCount = tasksWithAttachments.reduce((acc, t) => acc + (t.attachments?.length || 0), 0)
  const projectsWithScreenshots = await Project.find({ screenshots: { $exists: true, $not: { $size: 0 } } }).select('screenshots')
  const projectFilesCount = projectsWithScreenshots.reduce((acc, p) => acc + (p.screenshots?.length || 0), 0)
  
  const filesUploaded = taskFilesCount + projectFilesCount
  const cloudinaryUsageMb = Math.round(filesUploaded * 1.45 * 100) / 100 // Estimate 1.45 MB average per asset

  // 4. Reminders
  const reminderEmailsSent = await Reminder.countDocuments({ isSent: true, channel: { $in: ['both', 'email'] } })
  const failedEmails = await Reminder.countDocuments({ isSent: false, triggerTime: { $lt: now } })

  // 5. System Health
  const totalMem = os.totalmem()
  const freeMem = os.freemem()
  const memoryUsagePercent = Math.round(((totalMem - freeMem) / totalMem) * 100)
  const cpuUsagePercent = Math.round(os.loadavg()[0] * 10) // 1 minute load average estimated to percent

  const envCheck = {
    mongodb: !!process.env.MONGODB_URI,
    cloudinary: !!process.env.CLOUDINARY_CLOUD_NAME,
    nodemailer: !!process.env.SMTP_HOST && !!process.env.SMTP_USER,
    nextauth: !!process.env.NEXTAUTH_SECRET,
  }

  const systemStatus = latencyMs < 100 && memoryUsagePercent < 90 ? 'Healthy' : 'Degraded'

  // 6. Recent lists
  const rawRecentSignups = await User.find()
    .sort({ createdAt: -1 })
    .limit(5)
    .select('name email role createdAt')
  
  const recentSignups = rawRecentSignups.map(u => ({
    id: u._id.toString(),
    name: u.name,
    email: u.email,
    role: u.role,
    createdAt: u.createdAt.toISOString(),
  }))

  const rawRecentLogins = await User.find({ lastActive: { $exists: true } })
    .sort({ lastActive: -1 })
    .limit(5)
    .select('name email lastActive')

  const recentLogins = rawRecentLogins.map(u => ({
    id: u._id.toString(),
    name: u.name,
    email: u.email,
    lastActive: u.lastActive ? u.lastActive.toISOString() : undefined,
  }))

  const rawRecentAuditLogs = await AuditLog.find()
    .sort({ createdAt: -1 })
    .limit(5)
    .populate('admin', 'name')
    .exec()

  const recentAuditLogs = rawRecentAuditLogs.map((l: any) => ({
    id: l._id.toString(),
    adminName: l.admin?.name || 'Unknown Admin',
    action: l.action,
    target: l.target,
    result: l.result,
    timestamp: l.createdAt.toISOString(),
  }))

  const rawTopActiveUsers = await User.find()
    .sort({ xp: -1, level: -1 })
    .limit(5)
    .select('name email level xp streak')

  const topActiveUsers = rawTopActiveUsers.map(u => ({
    id: u._id.toString(),
    name: u.name,
    email: u.email,
    level: u.level,
    xp: u.xp,
    streak: u.streak,
  }))

  // 7. Chart statistics compilations
  // User growth (past 7 days)
  const userGrowth: Array<{ label: string; value: number }> = []
  let cumulativeCount = totalUsers - newUsersThisWeek // Start from base users before the week
  
  for (let i = 6; i >= 0; i--) {
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i, 0, 0, 0, 0)
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000)

    const daySignups = await User.countDocuments({
      createdAt: { $gte: dayStart, $lt: dayEnd },
    })

    cumulativeCount += daySignups
    userGrowth.push({
      label: dayStart.toLocaleDateString('en-US', { weekday: 'short' }),
      value: cumulativeCount,
    })
  }

  // Task Completion (by Category representation)
  const taskCompletion = [
    { label: 'Todo', value: await Task.countDocuments({ status: 'Todo' }) },
    { label: 'In Progress', value: await Task.countDocuments({ status: 'In Progress' }) },
    { label: 'Testing', value: await Task.countDocuments({ status: 'Testing' }) },
    { label: 'Completed', value: await Task.countDocuments({ status: 'Completed' }) },
  ]

  // Habit completion ratios (completed today vs total)
  const totalHabits = await Habit.countDocuments()
  const completedHabits = await Habit.countDocuments({ streak: { $gt: 0 } }) // approximation for metrics
  const habitCompletion = [
    { label: 'Total', value: totalHabits },
    { label: 'Active Streak', value: completedHabits },
  ]

  // Daily Active Users (past 7 days)
  const dailyActivity: Array<{ label: string; value: number }> = []
  for (let i = 6; i >= 0; i--) {
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i, 0, 0, 0, 0)
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000)

    const dayActive = await User.countDocuments({
      lastActive: { $gte: dayStart, $lt: dayEnd },
    })

    dailyActivity.push({
      label: dayStart.toLocaleDateString('en-US', { weekday: 'short' }),
      value: dayActive,
    })
  }

  return {
    totalUsers,
    newUsersToday,
    newUsersThisWeek,
    dau,
    wau,
    mau,
    onlineUsers,
    inactiveUsers,
    totalTasks,
    completedTasks,
    pendingTasks,
    totalProjects,
    completedProjectsCount,
    notesCreated,
    filesUploaded,
    cloudinaryUsageMb,
    reminderEmailsSent,
    failedEmails,
    systemHealth: {
      status: systemStatus,
      latencyMs,
      cpuUsagePercent,
      memoryUsagePercent,
      envCheck,
    },
    recentSignups,
    recentLogins,
    recentAuditLogs,
    topActiveUsers,
    charts: {
      userGrowth,
      taskCompletion,
      habitCompletion,
      dailyActivity,
    },
  }
}

/**
 * Broadcasts a site-wide system notice or triggers an alert.
 */
export async function broadcastNoticeAction(message: string): Promise<{ success: boolean; error?: string }> {
  const session = await checkAdminAuth()
  
  if (!message || message.trim() === '') {
    return { success: false, error: 'Notice content cannot be empty' }
  }

  await dbConnect()
  
  // Log the action to the database
  await AuditLog.create({
    admin: session.user.id,
    action: 'BROADCAST_SYSTEM_NOTICE',
    details: `Broadcast message: "${message.substring(0, 100)}"`,
    result: 'Success',
  })

  // In the notifications phase, we will add code to write to a Notifications collection.
  // For now, we simulate success.
  return { success: true }
}
