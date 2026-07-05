'use server'

import mongoose from 'mongoose'
import { auth } from '@/lib/auth'
import dbConnect from '@/lib/mongodb'
import Project from '@/models/Project'
import Bug from '@/models/Bug'
import Task from '@/models/Task'
import { generateAutoReminders, createProjectReminders } from '@/services/reminderService'

export interface ProjectResponse {
  success: boolean
  message?: string
  error?: string
  project?: any
  projects?: any[]
  bug?: any
  bugs?: any[]
  tasks?: any[]
}

// Session authentication check
async function checkAuth() {
  const session = await auth()
  if (!session || !session.user) {
    throw new Error('Unauthorized. Please log in.')
  }
  return session
}

// --- PROJECT ACTIONS ---
export async function createProjectAction(data: any): Promise<ProjectResponse> {
  try {
    const session = await checkAuth()
    const { title, description, githubLink, demoLink, deploymentLink, techStack, screenshots, notes, deadline } = data

    if (!title) {
      return { success: false, error: 'Project title is required.' }
    }

    await dbConnect()

    const deadlineDate = deadline ? new Date(deadline) : undefined
    const newProject = await Project.create({
      user: new mongoose.Types.ObjectId(session.user.id),
      title: title.trim(),
      description,
      githubLink: githubLink ? githubLink.trim() : undefined,
      demoLink: demoLink ? demoLink.trim() : undefined,
      deploymentLink: deploymentLink ? deploymentLink.trim() : undefined,
      techStack: techStack || [],
      screenshots: screenshots || [],
      notes,
      deadline: deadlineDate,
    })

    // Generate automatic reminders if deadline is provided
    if (deadlineDate) {
      const autoReminders = generateAutoReminders(deadlineDate, 'assignment') // Use 'assignment' type for projects
      if (autoReminders.length > 0) {
        await createProjectReminders(newProject._id.toString(), autoReminders)
      }
    }

    return {
      success: true,
      message: deadlineDate ? 'Project created! You\'ll receive automatic reminders 1 week before, 1 day before, and on the deadline.' : 'Project created successfully!',
      project: JSON.parse(JSON.stringify(newProject)),
    }
  } catch (error: any) {
    console.error('Create Project Error:', error)
    return { success: false, error: error.message || 'Failed to create project.' }
  }
}

export async function getProjectsAction(): Promise<ProjectResponse> {
  try {
    const session = await checkAuth()
    await dbConnect()

    const projects = await Project.find({ user: session.user.id }).sort({ createdAt: -1 })
    return {
      success: true,
      projects: JSON.parse(JSON.stringify(projects)),
    }
  } catch (error: any) {
    console.error('Get Projects Error:', error)
    return { success: false, error: error.message || 'Failed to fetch projects.' }
  }
}

export async function updateProjectAction(id: string, data: any): Promise<ProjectResponse> {
  try {
    const session = await checkAuth()
    await dbConnect()

    const project = await Project.findOne({ _id: id, user: session.user.id })
    if (!project) {
      return { success: false, error: 'Project not found.' }
    }

    const { title, description, githubLink, demoLink, deploymentLink, techStack, screenshots, notes } = data

    project.title = title || project.title
    project.description = description !== undefined ? description : project.description
    project.githubLink = githubLink !== undefined ? githubLink.trim() : project.githubLink
    project.demoLink = demoLink !== undefined ? demoLink.trim() : project.demoLink
    project.deploymentLink = deploymentLink !== undefined ? deploymentLink.trim() : project.deploymentLink
    project.techStack = techStack || project.techStack
    project.screenshots = screenshots || project.screenshots
    project.notes = notes !== undefined ? notes : project.notes

    await project.save()

    return {
      success: true,
      message: 'Project updated successfully!',
      project: JSON.parse(JSON.stringify(project)),
    }
  } catch (error: any) {
    console.error('Update Project Error:', error)
    return { success: false, error: error.message || 'Failed to update project.' }
  }
}

export async function deleteProjectAction(id: string): Promise<ProjectResponse> {
  try {
    const session = await checkAuth()
    await dbConnect()

    const project = await Project.findOne({ _id: id, user: session.user.id })
    if (!project) {
      return { success: false, error: 'Project not found.' }
    }

    // Cascade delete bugs and clear project references from tasks
    await Bug.deleteMany({ project: id })
    await Task.updateMany({ project: id }, { $unset: { project: '' } })
    await project.deleteOne()

    return {
      success: true,
      message: 'Project deleted successfully.',
    }
  } catch (error: any) {
    console.error('Delete Project Error:', error)
    return { success: false, error: error.message || 'Failed to delete project.' }
  }
}

// --- BUG ACTIONS ---
export async function createBugAction(data: any): Promise<ProjectResponse> {
  try {
    const session = await checkAuth()
    const { title, description, projectId, severity } = data

    if (!title || !projectId) {
      return { success: false, error: 'Bug summary and Project ID are required.' }
    }

    await dbConnect()

    const newBug = await Bug.create({
      user: new mongoose.Types.ObjectId(session.user.id),
      project: new mongoose.Types.ObjectId(projectId),
      title: title.trim(),
      description,
      severity,
      status: 'Open',
    })

    return {
      success: true,
      message: 'Bug logged in tracking list!',
      bug: JSON.parse(JSON.stringify(newBug)),
    }
  } catch (error: any) {
    console.error('Create Bug Error:', error)
    return { success: false, error: error.message || 'Failed to log bug.' }
  }
}

export async function getBugsAction(projectId: string): Promise<ProjectResponse> {
  try {
    const session = await checkAuth()
    await dbConnect()

    const bugs = await Bug.find({
      user: session.user.id,
      project: projectId,
    }).sort({ status: 1, severity: -1, createdAt: -1 })

    return {
      success: true,
      bugs: JSON.parse(JSON.stringify(bugs)),
    }
  } catch (error: any) {
    console.error('Get Bugs Error:', error)
    return { success: false, error: error.message || 'Failed to fetch bug reports.' }
  }
}

export async function updateBugAction(id: string, status: 'Open' | 'In Progress' | 'Resolved', severity?: 'Low' | 'Medium' | 'High' | 'Critical'): Promise<ProjectResponse> {
  try {
    const session = await checkAuth()
    await dbConnect()

    const bug = await Bug.findOne({ _id: id, user: session.user.id })
    if (!bug) {
      return { success: false, error: 'Bug record not found.' }
    }

    bug.status = status
    if (severity) {
      bug.severity = severity
    }
    await bug.save()

    return {
      success: true,
      message: 'Bug report updated!',
      bug: JSON.parse(JSON.stringify(bug)),
    }
  } catch (error: any) {
    console.error('Update Bug Error:', error)
    return { success: false, error: error.message || 'Failed to update bug report.' }
  }
}

export async function deleteBugAction(id: string): Promise<ProjectResponse> {
  try {
    const session = await checkAuth()
    await dbConnect()

    await Bug.deleteOne({ _id: id, user: session.user.id })

    return {
      success: true,
      message: 'Bug report deleted.',
    }
  } catch (error: any) {
    console.error('Delete Bug Error:', error)
    return { success: false, error: error.message || 'Failed to delete bug report.' }
  }
}
