'use server'

import mongoose from 'mongoose'
import { auth } from '@/lib/auth'
import dbConnect from '@/lib/mongodb'
import Task, { ITask, IReminderConfig } from '@/models/Task'
import User from '@/models/User'
import Reminder from '@/models/Reminder'
import { createTaskReminders, updateTaskReminders, deleteTaskReminders } from '@/services/reminderService'

export interface TaskResponse {
  success: boolean
  message?: string
  error?: string
  task?: any
  tasks?: any[]
}

// Check session authentication helper
async function checkAuth() {
  const session = await auth()
  if (!session || !session.user) {
    throw new Error('Unauthorized. Please log in.')
  }
  return session
}

export async function createTaskAction(data: any): Promise<TaskResponse> {
  try {
    const session = await checkAuth()
    await dbConnect()

    const {
      title,
      description,
      category,
      priority,
      difficulty,
      energyRequired,
      deadline,
      estimatedTime,
      tags,
      notes,
      reminderOffset,
      reminderConfigs,
    } = data

    if (!title || !deadline) {
      return { success: false, error: 'Title and deadline date are required.' }
    }

    const parsedDeadline = new Date(deadline)

    // Prepare reminder configurations
    let taskReminderConfigs: IReminderConfig[] = []
    
    // Support new reminderConfigs array format
    if (reminderConfigs && Array.isArray(reminderConfigs) && reminderConfigs.length > 0) {
      taskReminderConfigs = reminderConfigs
    }
    // Fallback to old reminderOffset format for backward compatibility
    else if (reminderOffset && Number(reminderOffset) > 0) {
      taskReminderConfigs = [
        {
          enabled: true,
          timeBefore: Number(reminderOffset),
          notificationType: 'both',
        },
      ]
    }

    const newTask = await Task.create({
      user: new mongoose.Types.ObjectId(session.user.id),
      title,
      description,
      category,
      priority,
      difficulty,
      energyRequired,
      status: 'Todo',
      deadline: parsedDeadline,
      estimatedTime: estimatedTime ? Number(estimatedTime) : undefined,
      tags: tags || [],
      notes,
      progress: 0,
      recurring: false,
      reminderOffset: reminderOffset ? Number(reminderOffset) : 0,
      reminderConfigs: taskReminderConfigs,
      attachments: [],
    })

    // Create reminder entries for each configured reminder
    if (taskReminderConfigs.length > 0) {
      await createTaskReminders(newTask._id.toString(), taskReminderConfigs)
    }

    return {
      success: true,
      message: 'Task created successfully!',
      task: JSON.parse(JSON.stringify(newTask)),
    }
  } catch (error: any) {
    console.error('Create Task Action Error:', error)
    return { success: false, error: error.message || 'Failed to create task.' }
  }
}

export async function getTasksAction(filter: string = 'All'): Promise<TaskResponse> {
  try {
    const session = await checkAuth()
    await dbConnect()

    const userId = new mongoose.Types.ObjectId(session.user.id)
    let query: any = { user: userId }

    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
    
    const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)
    const tomorrowEnd = new Date(todayEnd.getTime() + 24 * 60 * 60 * 1000)

    const nextWeekEnd = new Date(todayEnd.getTime() + 7 * 24 * 60 * 60 * 1000)

    if (filter === 'Today') {
      query.deadline = { $gte: todayStart, $lte: todayEnd }
    } else if (filter === 'Tomorrow') {
      query.deadline = { $gte: tomorrowStart, $lte: tomorrowEnd }
    } else if (filter === 'This Week') {
      query.deadline = { $gte: todayStart, $lte: nextWeekEnd }
    } else if (filter === 'Overdue') {
      query.deadline = { $lt: todayStart }
      query.status = { $ne: 'Completed' }
    } else if (filter === 'Completed') {
      query.status = 'Completed'
    } else if (filter === 'Upcoming') {
      query.deadline = { $gt: tomorrowEnd }
    }

    const tasks = await Task.find(query).sort({ deadline: 1, priority: -1 })

    return {
      success: true,
      tasks: JSON.parse(JSON.stringify(tasks)),
    }
  } catch (error: any) {
    console.error('Get Tasks Action Error:', error)
    return { success: false, error: error.message || 'Failed to fetch tasks.' }
  }
}

export async function updateTaskAction(id: string, data: any): Promise<TaskResponse> {
  try {
    const session = await checkAuth()
    await dbConnect()

    const task = await Task.findOne({ _id: id, user: session.user.id })
    if (!task) {
      return { success: false, error: 'Task not found or access denied.' }
    }

    const {
      title,
      description,
      category,
      priority,
      difficulty,
      energyRequired,
      deadline,
      estimatedTime,
      actualTime,
      tags,
      notes,
      reminderOffset,
      reminderConfigs,
    } = data

    const originalDeadline = task.deadline.getTime()
    const originalOffset = task.reminderOffset

    task.title = title || task.title
    task.description = description !== undefined ? description : task.description
    task.category = category || task.category
    task.priority = priority || task.priority
    task.difficulty = difficulty || task.difficulty
    task.energyRequired = energyRequired || task.energyRequired
    task.notes = notes !== undefined ? notes : task.notes
    task.tags = tags || task.tags
    task.estimatedTime = estimatedTime !== undefined ? Number(estimatedTime) : task.estimatedTime
    task.actualTime = actualTime !== undefined ? Number(actualTime) : task.actualTime
    
    if (deadline) {
      task.deadline = new Date(deadline)
    }

    const oldReminderOffset = task.reminderOffset
    task.reminderOffset = reminderOffset !== undefined ? Number(reminderOffset) : task.reminderOffset

    // Update reminder configurations
    if (reminderConfigs && Array.isArray(reminderConfigs)) {
      task.reminderConfigs = reminderConfigs
    }

    await task.save()

    // Re-schedule reminders if deadline or configs changed
    const currentDeadlineTime = task.deadline.getTime()
    if (currentDeadlineTime !== originalDeadline || task.reminderOffset !== originalOffset || reminderConfigs) {
      // Delete old reminders for this task
      await deleteTaskReminders(id)

      // Create new reminders based on configs
      if (reminderConfigs && Array.isArray(reminderConfigs) && reminderConfigs.length > 0) {
        await createTaskReminders(id, reminderConfigs)
      } else if (task.reminderOffset && task.reminderOffset > 0) {
        // Fallback to old reminder offset system
        const triggerTime = new Date(currentDeadlineTime - task.reminderOffset * 60 * 1000)
        if (triggerTime > new Date()) {
          await Reminder.create({
            user: new mongoose.Types.ObjectId(session.user.id),
            title: `Task Reminder: "${task.title}" is due soon!`,
            relatedTo: 'task',
            relatedId: new mongoose.Types.ObjectId(id),
            triggerTime,
            isSent: false,
            channel: 'both',
          })
        }
      }
    }

    return {
      success: true,
      message: 'Task updated successfully!',
      task: JSON.parse(JSON.stringify(task)),
    }
  } catch (error: any) {
    console.error('Update Task Action Error:', error)
    return { success: false, error: error.message || 'Failed to update task.' }
  }
}

export async function deleteTaskAction(id: string): Promise<TaskResponse> {
  try {
    const session = await checkAuth()
    await dbConnect()

    const task = await Task.findOne({ _id: id, user: session.user.id })
    if (!task) {
      return { success: false, error: 'Task not found or access denied.' }
    }

    // Delete all reminders associated with this task
    await deleteTaskReminders(id)
    })

    await task.deleteOne()

    return {
      success: true,
      message: 'Task deleted successfully!',
    }
  } catch (error: any) {
    console.error('Delete Task Action Error:', error)
    return { success: false, error: error.message || 'Failed to delete task.' }
  }
}

export async function updateTaskStatusAction(id: string, status: 'Todo' | 'In Progress' | 'Testing' | 'Completed'): Promise<TaskResponse> {
  try {
    const session = await checkAuth()
    await dbConnect()

    const task = await Task.findOne({ _id: id, user: session.user.id })
    if (!task) {
      return { success: false, error: 'Task not found.' }
    }

    const originalStatus = task.status as 'Todo' | 'In Progress' | 'Testing' | 'Completed'
    task.status = status
    
    if (status === 'Completed') {
      task.progress = 100
    } else if (originalStatus === 'Completed') {
      task.progress = 50 // Re-evaluate progress
    }

    await task.save()

    // Gamification Hook: Reward XP on task completion
    if (status === 'Completed' && originalStatus !== 'Completed') {
      let xpEarned = 20
      if (task.priority === 'Low') xpEarned = 10
      if (task.priority === 'High') xpEarned = 35

      const user = await User.findById(session.user.id)
      if (user) {
        user.xp += xpEarned
        const newLevel = Math.floor(user.xp / 100) + 1
        let levelUp = false

        if (newLevel > user.level) {
          user.level = newLevel
          levelUp = true
        }
        await user.save()
        
        return {
          success: true,
          message: levelUp 
            ? `Task completed! +${xpEarned} XP. LEVEL UP! You are now Level ${newLevel}!` 
            : `Task completed! +${xpEarned} XP.`,
          task: JSON.parse(JSON.stringify(task)),
        }
      }
    }

    return {
      success: true,
      message: `Task moved to ${status}.`,
      task: JSON.parse(JSON.stringify(task)),
    }
  } catch (error: any) {
    console.error('Update Task Status Action Error:', error)
    return { success: false, error: error.message || 'Failed to update task status.' }
  }
}
