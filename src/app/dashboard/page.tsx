import React from 'react'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/mongodb'
import User from '@/models/User'
import Task from '@/models/Task'
import Habit from '@/models/Habit'
import TimeBlock from '@/models/TimeBlock'
import DashboardClient from './DashboardClient'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  
  if (!session || !session.user) {
    return null // Handled by layout redirect
  }

  await dbConnect()

  const userId = session.user.id
  const todayStr = new Date().toISOString().split('T')[0]

  // Fetch initial profile stats
  const user = await User.findById(userId).select('name email image xp level streak longestStreak')
  const serializedUser = user ? JSON.parse(JSON.stringify(user)) : null

  // Fetch incomplete tasks sorted by deadline
  const tasks = await Task.find({
    user: userId,
    status: { $ne: 'Completed' },
  }).sort({ deadline: 1 }).limit(10)
  const serializedTasks = JSON.parse(JSON.stringify(tasks))

  // Fetch habits
  const habits = await Habit.find({ user: userId }).sort({ createdAt: -1 })
  const serializedHabits = JSON.parse(JSON.stringify(habits))

  // Fetch time blocks for today
  const timeBlocks = await TimeBlock.find({
    user: userId,
    date: todayStr,
  }).sort({ position: 1, startTime: 1 })
  const serializedTimeBlocks = JSON.parse(JSON.stringify(timeBlocks))

  return (
    <DashboardClient 
      initialUserProfile={serializedUser}
      initialTasks={serializedTasks}
      initialHabits={serializedHabits}
      initialTimeBlocks={serializedTimeBlocks}
    />
  )
}
