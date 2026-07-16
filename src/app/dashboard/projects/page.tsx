import React from 'react'
import { auth } from '@/lib/auth'
import dbConnect from '@/lib/mongodb'
import Project from '@/models/Project'
import Bug from '@/models/Bug'
import Task from '@/models/Task'
import ProjectsClient from './ProjectsClient'
import { verifyFeature } from '@/lib/checkFeature'

export const dynamic = 'force-dynamic'

export default async function ProjectsPage() {
  await verifyFeature('projects')
  
  const session = await auth()
  
  if (!session || !session.user) {
    return null
  }

  await dbConnect()

  const userId = session.user.id

  // Fetch projects, tasks, and bugs
  const projects = await Project.find({ user: userId }).sort({ createdAt: -1 })
  const tasks = await Task.find({ user: userId, project: { $exists: true } }).sort({ deadline: 1 })
  const bugs = await Bug.find({ user: userId }).sort({ status: 1, severity: -1, createdAt: -1 })

  return (
    <ProjectsClient 
      initialProjects={JSON.parse(JSON.stringify(projects))}
      initialAllTasks={JSON.parse(JSON.stringify(tasks))}
      initialAllBugs={JSON.parse(JSON.stringify(bugs))}
    />
  )
}
