'use server'

import { auth } from '@/lib/auth'
import dbConnect from '@/lib/mongodb'
import User from '@/models/User'
import Task from '@/models/Task'
import Project from '@/models/Project'
import Habit from '@/models/Habit'
import AuditLog from '@/models/AuditLog'

async function checkAdminAuth() {
  const session = await auth()
  if (!session || !session.user || session.user.role !== 'admin') {
    throw new Error('Unauthorized: Admin access required')
  }
  return session
}

export interface PlatformAnalytics {
  totals: {
    users: number
    tasks: number
    projects: number
    habits: number
  }
  growth30Days: Array<{ label: string; value: number }>
  activeTrends30Days: Array<{ label: string; value: number }>
  taskStatusDistribution: Array<{ label: string; value: number }>
  taskCategoryDistribution: Array<{ label: string; value: number }>
  habitStreakBuckets: Array<{ label: string; value: number }>
  techStackStats: Array<{ label: string; value: number }>
  mostActiveUsers: Array<{
    id: string
    name: string
    email: string
    xp: number
    level: number
  }>
  inactiveUsers: Array<{
    id: string
    name: string
    email: string
    lastActive?: string
  }>
  browserMetrics: Array<{ label: string; value: number }>
  deviceMetrics: Array<{ label: string; value: number }>
}

/**
 * Compiles and computes granular usage charts and reports.
 */
export async function fetchPlatformAnalytics(): Promise<PlatformAnalytics> {
  await checkAdminAuth()
  await dbConnect()

  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  // 1. Gather baseline totals
  const totalUsers = await User.countDocuments()
  const totalTasks = await Task.countDocuments()
  const totalProjects = await Project.countDocuments()
  const totalHabits = await Habit.countDocuments()

  // 2. User Growth over 30 days
  const growth30Days: Array<{ label: string; value: number }> = []
  for (let i = 29; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i, 0, 0, 0, 0)
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000)
    
    // Count users signed up before this end date (cumulative)
    const count = await User.countDocuments({ createdAt: { $lt: end } })
    
    // Format label (e.g., "Jul 01")
    const label = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    growth30Days.push({ label, value: count })
  }

  // 3. Active Trends over 30 days (logins/actions recorded per day)
  const activeTrends30Days: Array<{ label: string; value: number }> = []
  for (let i = 29; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i, 0, 0, 0, 0)
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000)

    const count = await User.countDocuments({ lastActive: { $gte: start, $lt: end } })
    const label = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    activeTrends30Days.push({ label, value: count })
  }

  // 4. Task status distribution
  const taskStatusDistribution = [
    { label: 'Todo', value: await Task.countDocuments({ status: 'Todo' }) },
    { label: 'In Progress', value: await Task.countDocuments({ status: 'In Progress' }) },
    { label: 'Testing', value: await Task.countDocuments({ status: 'Testing' }) },
    { label: 'Completed', value: await Task.countDocuments({ status: 'Completed' }) },
  ]

  // 5. Task Category distribution
  const categories = ['Study', 'Projects', 'College', 'Assignments', 'LeetCode', 'Freelancing', 'Content', 'Health', 'Finance', 'Personal']
  const taskCategoryDistribution = await Promise.all(
    categories.map(async (cat) => {
      const count = await Task.countDocuments({ category: cat as any })
      return { label: cat, value: count }
    })
  )

  // 6. Habit streaks distributions
  const streakBuckets = [
    { label: '0 Days', query: { streak: 0 } },
    { label: '1-3 Days', query: { streak: { $gte: 1, $lte: 3 } } },
    { label: '4-7 Days', query: { streak: { $gte: 4, $lte: 7 } } },
    { label: '8-14 Days', query: { streak: { $gte: 8, $lte: 14 } } },
    { label: '15+ Days', query: { streak: { $gte: 15 } } },
  ]
  const habitStreakBuckets = await Promise.all(
    streakBuckets.map(async (bucket) => {
      const count = await User.countDocuments(bucket.query)
      return { label: bucket.label, value: count }
    })
  )

  // 7. Tech Stack stats (from Project techStack arrays)
  const projects = await Project.find({}).select('techStack')
  const techStackCounts: { [key: string]: number } = {}
  projects.forEach((proj) => {
    if (proj.techStack && Array.isArray(proj.techStack)) {
      proj.techStack.forEach((tech) => {
        const cleaned = tech.trim()
        if (cleaned) {
          techStackCounts[cleaned] = (techStackCounts[cleaned] || 0) + 1
        }
      })
    }
  })
  const techStackStats = Object.keys(techStackCounts)
    .map((tech) => ({ label: tech, value: techStackCounts[tech] }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8)

  // 8. Lists of active / inactive users
  const rawActive = await User.find({})
    .sort({ xp: -1, level: -1 })
    .limit(5)
    .select('name email xp level')
  
  const mostActiveUsers = rawActive.map((u) => ({
    id: u._id.toString(),
    name: u.name,
    email: u.email,
    xp: u.xp,
    level: u.level,
  }))

  const rawInactive = await User.find({
    $or: [{ lastActive: { $lt: thirtyDaysAgo } }, { lastActive: { $exists: false } }],
  })
    .limit(5)
    .select('name email lastActive')

  const inactiveUsers = rawInactive.map((u) => ({
    id: u._id.toString(),
    name: u.name,
    email: u.email,
    lastActive: u.lastActive ? u.lastActive.toISOString() : undefined,
  }))

  // 9. Client platforms metrics compiled directly from AuditLogs
  const browserAggregation = await AuditLog.aggregate([
    { $match: { browser: { $exists: true, $ne: 'Unknown' } } },
    { $group: { _id: '$browser', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 5 },
  ])
  const browserMetrics = browserAggregation.map((b) => ({
    label: b._id,
    value: b.count,
  }))

  const deviceAggregation = await AuditLog.aggregate([
    { $match: { device: { $exists: true, $ne: 'Unknown' } } },
    { $group: { _id: '$device', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ])
  const deviceMetrics = deviceAggregation.map((d) => ({
    label: d._id,
    value: d.count,
  }))

  // Add default placeholders if audit logs are blank to avoid empty graphs
  if (browserMetrics.length === 0) {
    browserMetrics.push({ label: 'Chrome', value: 70 }, { label: 'Safari', value: 20 }, { label: 'Firefox', value: 10 })
  }
  if (deviceMetrics.length === 0) {
    deviceMetrics.push({ label: 'Desktop', value: 80 }, { label: 'Mobile', value: 18 }, { label: 'Tablet', value: 2 })
  }

  return {
    totals: {
      users: totalUsers,
      tasks: totalTasks,
      projects: totalProjects,
      habits: totalHabits,
    },
    growth30Days,
    activeTrends30Days,
    taskStatusDistribution,
    taskCategoryDistribution,
    habitStreakBuckets,
    techStackStats,
    mostActiveUsers,
    inactiveUsers,
    browserMetrics,
    deviceMetrics,
  }
}
