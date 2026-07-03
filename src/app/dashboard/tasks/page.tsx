import React from 'react'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/mongodb'
import Task from '@/models/Task'
import TasksClient from './TasksClient'

export const dynamic = 'force-dynamic'

export default async function TasksPage() {
  const session = await getServerSession(authOptions)
  
  if (!session || !session.user) {
    return null
  }

  await dbConnect()

  const tasks = await Task.find({ user: session.user.id }).sort({ deadline: 1 })
  const serializedTasks = JSON.parse(JSON.stringify(tasks))

  return <TasksClient initialTasks={serializedTasks} />
}
