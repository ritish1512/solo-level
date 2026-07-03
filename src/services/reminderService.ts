'use server'

import mongoose from 'mongoose'
import dbConnect from '@/lib/mongodb'
import Task, { IReminderConfig } from '@/models/Task'
import Reminder from '@/models/Reminder'
import User from '@/models/User'
import { sendTaskDeadlineReminder } from './emailService'

/**
 * Preset reminder times (in minutes before deadline)
 */
export const REMINDER_PRESETS = {
  '15_MINUTES': 15,
  '30_MINUTES': 30,
  '1_HOUR': 60,
  '2_HOURS': 120,
  '1_DAY': 1440,
  '2_DAYS': 2880,
  '1_WEEK': 10080,
  'CUSTOM': -1, // User provides custom value
}

/**
 * Create reminder configurations for a task
 */
export async function createTaskReminders(
  taskId: string,
  reminderConfigs: IReminderConfig[]
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    await dbConnect()

    const task = await Task.findById(taskId)
    if (!task) {
      return { success: false, error: 'Task not found' }
    }

    // Store reminder configs
    task.reminderConfigs = reminderConfigs.filter((config) => config.enabled)
    await task.save()

    // Create Reminder documents for each config
    for (const config of reminderConfigs) {
      if (!config.enabled) continue

      const triggerTime = new Date(task.deadline.getTime() - config.timeBefore * 60 * 1000)

      // Only create reminder if trigger time is in the future
      if (triggerTime > new Date()) {
        await Reminder.create({
          user: task.user,
          title: `Task Reminder: "${task.title}" is due soon!`,
          relatedTo: 'task',
          relatedId: taskId,
          triggerTime,
          isSent: false,
          emailSent: false,
          channel: config.notificationType,
        })
      }
    }

    return { success: true, message: 'Reminders created successfully' }
  } catch (error: any) {
    console.error('Create Task Reminders Error:', error)
    return { success: false, error: error.message || 'Failed to create reminders' }
  }
}

/**
 * Update reminder configurations for a task
 */
export async function updateTaskReminders(
  taskId: string,
  reminderConfigs: IReminderConfig[]
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    await dbConnect()

    // Delete existing reminders for this task
    await Reminder.deleteMany({ relatedId: new mongoose.Types.ObjectId(taskId) })

    // Create new reminders
    return await createTaskReminders(taskId, reminderConfigs)
  } catch (error: any) {
    console.error('Update Task Reminders Error:', error)
    return { success: false, error: error.message || 'Failed to update reminders' }
  }
}

/**
 * Process pending reminders and send emails/notifications
 * This should be called by a cron job or background task
 */
export async function processPendingReminders(): Promise<{
  processed: number
  sent: number
  failed: number
}> {
  try {
    await dbConnect()

    const now = new Date()
    let processed = 0
    let sent = 0
    let failed = 0

    // Find reminders that should trigger now
    const pendingReminders = await Reminder.find({
      isSent: false,
      triggerTime: { $lte: now },
    }).populate('user relatedId')

    for (const reminder of pendingReminders) {
      processed++

      try {
        // Send email if channel includes email
        if (reminder.channel === 'email' || reminder.channel === 'both') {
          const user = reminder.user as any
          const task = reminder.relatedId as any

          if (user && user.email && task && task.title) {
            const hoursUntil = Math.ceil(
              (new Date(task.deadline).getTime() - now.getTime()) / (1000 * 60 * 60)
            )

            const emailResult = await sendTaskDeadlineReminder(
              user.email,
              user.name || 'User',
              task.title,
              task.deadline,
              Math.max(0, hoursUntil)
            )

            if (emailResult.success) {
              reminder.emailSent = true
              sent++
            } else {
              failed++
            }
          }
        }

        // Mark reminder as sent
        reminder.isSent = true
        await reminder.save()
      } catch (error) {
        console.error(`Failed to process reminder ${reminder._id}:`, error)
        failed++
      }
    }

    console.log(
      `Reminder Processing: ${processed} processed, ${sent} emails sent, ${failed} failed`
    )
    return { processed, sent, failed }
  } catch (error) {
    console.error('Process Pending Reminders Error:', error)
    return { processed: 0, sent: 0, failed: 0 }
  }
}

/**
 * Get all reminders for a user
 */
export async function getUserReminders(userId: string): Promise<any[]> {
  try {
    await dbConnect()

    return await Reminder.find({ user: new mongoose.Types.ObjectId(userId) })
      .sort({ triggerTime: -1 })
      .populate('relatedId')
      .lean()
  } catch (error) {
    console.error('Get User Reminders Error:', error)
    return []
  }
}

/**
 * Get pending reminders for a user
 */
export async function getUserPendingReminders(userId: string): Promise<any[]> {
  try {
    await dbConnect()

    const now = new Date()
    return await Reminder.find({
      user: new mongoose.Types.ObjectId(userId),
      isSent: false,
      triggerTime: { $lte: now },
    })
      .sort({ triggerTime: 1 })
      .populate('relatedId')
      .lean()
  } catch (error) {
    console.error('Get User Pending Reminders Error:', error)
    return []
  }
}

/**
 * Delete reminders for a task
 */
export async function deleteTaskReminders(taskId: string): Promise<void> {
  try {
    await dbConnect()
    await Reminder.deleteMany({ relatedId: new mongoose.Types.ObjectId(taskId) })
  } catch (error) {
    console.error('Delete Task Reminders Error:', error)
  }
}

/**
 * Get reminder configuration presets with labels
 */
export function getReminderPresets() {
  return [
    { label: '15 minutes', value: REMINDER_PRESETS['15_MINUTES'] },
    { label: '30 minutes', value: REMINDER_PRESETS['30_MINUTES'] },
    { label: '1 hour', value: REMINDER_PRESETS['1_HOUR'] },
    { label: '2 hours', value: REMINDER_PRESETS['2_HOURS'] },
    { label: '1 day', value: REMINDER_PRESETS['1_DAY'] },
    { label: '2 days', value: REMINDER_PRESETS['2_DAYS'] },
    { label: '1 week', value: REMINDER_PRESETS['1_WEEK'] },
  ]
}

/**
 * Format minutes to human-readable time
 */
export function formatMinutesToTime(minutes: number): string {
  if (minutes < 60) return `${minutes} minutes`
  if (minutes < 1440) return `${Math.floor(minutes / 60)} hour${Math.floor(minutes / 60) > 1 ? 's' : ''}`
  if (minutes < 10080) return `${Math.floor(minutes / 1440)} day${Math.floor(minutes / 1440) > 1 ? 's' : ''}`
  return `${Math.floor(minutes / 10080)} week${Math.floor(minutes / 10080) > 1 ? 's' : ''}`
}
