
import mongoose from 'mongoose'
import dbConnect from '@/lib/mongodb'
import Task, { IReminderConfig } from '@/models/Task'
import Reminder from '@/models/Reminder'
import User from '@/models/User'
import { sendTaskDeadlineReminder } from './emailService'
import { REMINDER_PRESETS } from '@/lib/reminderUtils'

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
 * Create reminders for an assignment
 */
export async function createAssignmentReminders(
  assignmentId: string
): Promise<void> {
  try {
    await dbConnect()
    const { Assignment } = await import('@/models/College')
    const assignment = await Assignment.findById(assignmentId).populate('subject')
    if (!assignment) return

    const defaultConfigs = [
      { enabled: true, timeBefore: 1440, notificationType: 'both' as const }, // 1 day
      { enabled: true, timeBefore: 120, notificationType: 'both' as const },  // 2 hours
    ]

    assignment.reminderConfigs = defaultConfigs
    await assignment.save()

    for (const config of defaultConfigs) {
      const triggerTime = new Date(assignment.dueDate.getTime() - config.timeBefore * 60 * 1000)
      if (triggerTime > new Date()) {
        const subjectName = (assignment.subject as any)?.name || 'Subject'
        await Reminder.create({
          user: assignment.user,
          title: `Assignment Alert: "${assignment.title}" (${subjectName}) is due soon!`,
          relatedTo: 'assignment',
          relatedId: assignment._id,
          triggerTime,
          isSent: false,
          channel: config.notificationType,
        })
      }
    }
  } catch (error) {
    console.error('Create Assignment Reminders Error:', error)
  }
}

/**
 * Delete reminders for an assignment
 */
export async function deleteAssignmentReminders(assignmentId: string): Promise<void> {
  try {
    await dbConnect()
    await Reminder.deleteMany({ relatedId: new mongoose.Types.ObjectId(assignmentId) })
  } catch (error) {
    console.error('Delete Assignment Reminders Error:', error)
  }
}

/**
 * Create reminders for an exam
 */
export async function createExamReminders(
  examId: string
): Promise<void> {
  try {
    await dbConnect()
    const { Exam } = await import('@/models/College')
    const exam = await Exam.findById(examId).populate('subject')
    if (!exam) return

    const defaultConfigs = [
      { enabled: true, timeBefore: 1440, notificationType: 'both' as const }, // 1 day
      { enabled: true, timeBefore: 120, notificationType: 'both' as const },  // 2 hours
    ]

    exam.reminderConfigs = defaultConfigs
    await exam.save()

    for (const config of defaultConfigs) {
      const triggerTime = new Date(exam.date.getTime() - config.timeBefore * 60 * 1000)
      if (triggerTime > new Date()) {
        const subjectName = (exam.subject as any)?.name || 'Subject'
        await Reminder.create({
          user: exam.user,
          title: `Exam Alert: "${exam.examType} Exam" (${subjectName}) is scheduled soon!`,
          relatedTo: 'exam',
          relatedId: exam._id,
          triggerTime,
          isSent: false,
          channel: config.notificationType,
        })
      }
    }
  } catch (error) {
    console.error('Create Exam Reminders Error:', error)
  }
}

/**
 * Delete reminders for an exam
 */
export async function deleteExamReminders(examId: string): Promise<void> {
  try {
    await dbConnect()
    await Reminder.deleteMany({ relatedId: new mongoose.Types.ObjectId(examId) })
  } catch (error) {
    console.error('Delete Exam Reminders Error:', error)
  }
}

export { getReminderPresets, formatMinutesToTime } from '@/lib/reminderUtils'
