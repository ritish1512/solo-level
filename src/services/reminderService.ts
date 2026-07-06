
import mongoose from 'mongoose'
import dbConnect from '@/lib/mongodb'
import Task, { IReminderConfig, IRecurringReminderConfig } from '@/models/Task'
import Reminder from '@/models/Reminder'
import User from '@/models/User'
import Notification from '@/models/Notification'
import {
  sendTaskDeadlineReminder,
  sendExamReminder,
  sendAssignmentReminder,
  sendDailyHabitReminder,
  sendTimeBlockNotification,
  sendCustomEventReminder,
  sendScheduledContentReminder
} from './emailService'
import { REMINDER_PRESETS } from '@/lib/reminderUtils'

// Normalize reminder times: if a date-only value (00:00:00) is provided,
// set it to a sensible default time (09:00 local) so reminders don't fire at midnight UTC.
function normalizeReminderTime(d :any) {
  if (!d || !(d instanceof Date)) return d
  // If time is midnight (likely a date-only ISO string), set to 9 AM local
  if (d.getHours() === 0 && d.getMinutes() === 0 && d.getSeconds() === 0) {
    d.setHours(9, 0, 0, 0)
  }
  return d
}


/**
 * Generate automatic reminder presets for assignments/exams
 * Creates reminders for: 1 week before, 1 day before, and on the day
 */
export function generateAutoReminders(dueDate: Date, itemType: 'assignment' | 'exam'): IReminderConfig[] {
  const reminders: IReminderConfig[] = []
  const oneWeekBefore = new Date(dueDate)
  oneWeekBefore.setDate(oneWeekBefore.getDate() - 7)
  
  const oneDayBefore = new Date(dueDate)
  oneDayBefore.setDate(oneDayBefore.getDate() - 1)
  
  const onTheDay = new Date(dueDate)
  onTheDay.setHours(9, 0, 0, 0) // 9 AM on the due date

  // Only add reminders if they're in the future
  const now = new Date()

  if (oneWeekBefore > now) {
    reminders.push({
      enabled: true,
      reminderTime: oneWeekBefore,
      message: `${itemType === 'assignment' ? 'Assignment' : 'Exam'} due in 1 week`,
      notificationType: 'both',
    })
  }

  if (oneDayBefore > now) {
    reminders.push({
      enabled: true,
      reminderTime: oneDayBefore,
      message: `${itemType === 'assignment' ? 'Assignment' : 'Exam'} due tomorrow`,
      notificationType: 'both',
    })
  }

  if (onTheDay > now) {
    reminders.push({
      enabled: true,
      reminderTime: onTheDay,
      message: `${itemType === 'assignment' ? 'Assignment' : 'Exam'} due today`,
      notificationType: 'both',
    })
  }

  return reminders
}

/**
 * Create reminder configurations for a project
 */
export async function createProjectReminders(
  projectId: string,
  reminderConfigs: IReminderConfig[]
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    await dbConnect()
    const Project = await import('@/models/Project')
    const project = await Project.default.findById(projectId)
    if (!project) {
      return { success: false, error: 'Project not found' }
    }

    // Create reminder documents
    for (const config of reminderConfigs) {
      if (!config.enabled) continue

      const triggerTime = normalizeReminderTime(new Date(config.reminderTime))
      if (triggerTime > new Date()) {
        await Reminder.create({
          user: project.user,
          title: `Project Reminder: "${project.title}"`,
          message: config.message || `Project deadline approaching: "${project.title}"`,
          relatedTo: 'project',
          relatedId: project._id,
          triggerTime,
          isSent: false,
          channel: config.notificationType,
        })
      }
    }

    return { success: true, message: 'Project reminders created successfully' }
  } catch (error: any) {
    console.error('Create Project Reminders Error:', error)
    return { success: false, error: error.message || 'Failed to create project reminders' }
  }
}

/**
 * Delete reminders for a project
 */
export async function deleteProjectReminders(projectId: string): Promise<void> {
  try {
    await dbConnect()
    await Reminder.deleteMany({ relatedId: new mongoose.Types.ObjectId(projectId) })
  } catch (error) {
    console.error('Delete Project Reminders Error:', error)
  }
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

      const triggerTime = normalizeReminderTime(new Date(config.reminderTime))

      // Only create reminder if trigger time is in the future
      if (triggerTime > new Date()) {
        await Reminder.create({
          user: task.user,
          title: `Task Reminder: "${task.title}"`,
          message: config.message || `Task "${task.title}" is due soon!`,
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
    }).populate('user')

    for (const reminder of pendingReminders) {
      processed++

      try {
        const user = reminder.user as any

        // Track delivery outcomes so we only mark the reminder as sent
        // when at least one configured channel was successfully delivered.
        let emailSuccess = false
        let notifCreated = false

        // If user has no email and the reminder only targets email, skip and leave for retry
        if (!user) {
          // No valid user — mark as sent to avoid phantom retries
          reminder.isSent = true
          await reminder.save()
          continue
        }

        // Send email if channel includes email and user has an email
        if ((reminder.channel === 'email' || reminder.channel === 'both') && user.email) {
          let emailResult

          switch (reminder.relatedTo) {
            case 'task': {
              const Task = await import('@/models/Task')
              const task = await Task.default.findById(reminder.relatedId)
              if (task) {
                const hoursUntil = Math.ceil(
                  (new Date(task.deadline).getTime() - now.getTime()) / (1000 * 60 * 60)
                )
                emailResult = await sendTaskDeadlineReminder(
                  user.email,
                  user.name || 'User',
                  task.title,
                  task.deadline,
                  Math.max(0, hoursUntil),
                  reminder.message
                )
              }
              break
            }
            case 'exam': {
              const { Exam } = await import('@/models/College')
              const exam = await Exam.findById(reminder.relatedId).populate('subject')
              if (exam) {
                const hoursUntil = Math.ceil(
                  (new Date(exam.date).getTime() - now.getTime()) / (1000 * 60 * 60)
                )
                const subjectName = (exam as any).subject?.name || 'Subject'
                emailResult = await sendExamReminder(
                  user.email,
                  user.name || 'User',
                  exam.examType,
                  subjectName,
                  exam.date,
                  Math.max(0, hoursUntil),
                  reminder.message
                )
              }
              break
            }
            case 'assignment': {
              const { Assignment } = await import('@/models/College')
              const assignment = await Assignment.findById(reminder.relatedId).populate('subject')
              if (assignment) {
                const hoursUntil = Math.ceil(
                  (new Date(assignment.dueDate).getTime() - now.getTime()) / (1000 * 60 * 60)
                )
                const subjectName = (assignment as any).subject?.name || 'Subject'
                emailResult = await sendAssignmentReminder(
                  user.email,
                  user.name || 'User',
                  assignment.title,
                  subjectName,
                  assignment.dueDate,
                  Math.max(0, hoursUntil),
                  reminder.message
                )
              }
              break
            }
            case 'habit': {
              const Habit = await import('@/models/Habit')
              const habit = await Habit.default.findById(reminder.relatedId)
              if (habit) {
                emailResult = await sendDailyHabitReminder(
                  user.email,
                  user.name || 'User',
                  [habit.name],
                  reminder.message
                )

                if (reminder.triggerTime) {
                  const nextTriggerTime = new Date(reminder.triggerTime)
                  do {
                    nextTriggerTime.setDate(nextTriggerTime.getDate() + 1)
                  } while (nextTriggerTime <= now)

                  const existingNextReminder = await Reminder.findOne({
                    relatedTo: 'habit',
                    relatedId: habit._id,
                    triggerTime: nextTriggerTime,
                  })

                  if (!existingNextReminder) {
                    await Reminder.create({
                      user: habit.user,
                      title: `Habit Reminder: "${habit.name}"`,
                      message: reminder.message || `Time to complete your habit: "${habit.name}"`,
                      relatedTo: 'habit',
                      relatedId: habit._id,
                      triggerTime: nextTriggerTime,
                      isSent: false,
                      channel: reminder.channel || 'both',
                    })
                  }
                }
              }
              break
            }
            case 'event': {
              const TimeBlock = await import('@/models/TimeBlock')
              const timeBlock = await TimeBlock.default.findById(reminder.relatedId)
              if (timeBlock) {
                emailResult = await sendTimeBlockNotification(
                  user.email,
                  user.name || 'User',
                  timeBlock.title,
                  timeBlock.startTime,
                  timeBlock.date,
                  reminder.message
                )
              }
              break
            }
            case 'custom': {
              // Check if it's a content idea or subject reminder
              const ContentIdea = await import('@/models/ContentIdea')
              const content = await ContentIdea.default.findById(reminder.relatedId)
              if (content && content.scheduledDate) {
                emailResult = await sendScheduledContentReminder(
                  user.email,
                  user.name || 'User',
                  content.title,
                  content.platform,
                  content.scheduledDate,
                  reminder.message
                )
                break
              }

              const { Subject } = await import('@/models/College')
              const subject = await Subject.findById(reminder.relatedId)
              if (subject) {
                emailResult = await sendCustomEventReminder(
                  user.email,
                  user.name || 'User',
                  reminder.title,
                  reminder.triggerTime,
                  reminder.message
                )
                break
              }

              // Fallback to generic custom reminder
              emailResult = await sendCustomEventReminder(
                user.email,
                user.name || 'User',
                reminder.title,
                reminder.triggerTime,
                reminder.message
              )
              break
            }
            default: {
              // Generic reminder
              emailResult = await sendCustomEventReminder(
                user.email,
                user.name || 'User',
                reminder.title,
                reminder.triggerTime
              )
              break
            }
          }

          if (emailResult && emailResult.success) {
            reminder.emailSent = true
            emailSuccess = true
            sent++
          } else {
            // keep failed count but do not mark isSent yet so retries are possible
            failed++
          }
        }

        // Create in-app notification if channel includes in-app
        console.log(`Reminder channel: ${reminder.channel}, creating notification: ${reminder.channel === 'in-app' || reminder.channel === 'both'}`)
        if (reminder.channel === 'in-app' || reminder.channel === 'both') {
          try {
            await Notification.create({
              user: reminder.user,
              title: reminder.title,
              message: reminder.message || 'You have a new reminder.',
              type: 'info',
              scheduledFor: now,
              isRead: false,
            })
            notifCreated = true
            console.log(`Successfully created in-app notification for reminder ${reminder._id}`)
          } catch (notifError) {
            console.error('Failed to create in-app notification:', notifError)
          }
        }

        // Decide whether to mark the reminder as sent:
        // - If channel=email and email succeeded => mark sent
        // - If channel=in-app and notification created => mark sent
        // - If channel=both and either email or in-app succeeded => mark sent
        const shouldMarkSent =
          (reminder.channel === 'email' && emailSuccess) ||
          (reminder.channel === 'in-app' && notifCreated) ||
          (reminder.channel === 'both' && (emailSuccess || notifCreated))

        if (shouldMarkSent) {
          reminder.isSent = true
          if (emailSuccess) reminder.emailSent = true
          await reminder.save()
        } else {
          // Do not mark as sent; allow the cron to retry later
          await reminder.save()
        }
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
  assignmentId: string,
  reminderConfigs?: IReminderConfig[]
): Promise<void> {
  try {
    await dbConnect()
    const { Assignment } = await import('@/models/College')
    const assignment = await Assignment.findById(assignmentId).populate('subject')
    if (!assignment) return

    const configs = reminderConfigs || assignment.reminderConfigs
    if (!configs || configs.length === 0) return

    assignment.reminderConfigs = configs.filter((config) => config.enabled)
    await assignment.save()

    for (const config of configs) {
      if (!config.enabled) continue

      const triggerTime = normalizeReminderTime(new Date(config.reminderTime))
      if (triggerTime > new Date()) {
        const subjectName = (assignment.subject as any)?.name || 'Subject'
        await Reminder.create({
          user: assignment.user,
          title: `Assignment Alert: "${assignment.title}" (${subjectName})`,
          message: config.message || `Assignment "${assignment.title}" is due soon!`,
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
  examId: string,
  reminderConfigs?: IReminderConfig[]
): Promise<void> {
  try {
    await dbConnect()
    const { Exam } = await import('@/models/College')
    const exam = await Exam.findById(examId).populate('subject')
    if (!exam) return

    const configs = reminderConfigs || exam.reminderConfigs
    if (!configs || configs.length === 0) return

    exam.reminderConfigs = configs.filter((config) => config.enabled)
    await exam.save()

    for (const config of configs) {
      if (!config.enabled) continue

      const triggerTime = normalizeReminderTime(new Date(config.reminderTime))
      if (triggerTime > new Date()) {
        const subjectName = (exam.subject as any)?.name || 'Subject'
        await Reminder.create({
          user: exam.user,
          title: `Exam Alert: "${exam.examType} Exam" (${subjectName})`,
          message: config.message || `Exam "${exam.examType}" is scheduled soon!`,
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

/**
 * Create reminders for a habit (recurring daily at specified time)
 */
export async function createHabitReminders(
  habitId: string,
  reminderConfigs?: IRecurringReminderConfig[]
): Promise<void> {
  try {
    await dbConnect()
    const { default: Habit } = await import('@/models/Habit')
    const habit = await Habit.findById(habitId)
    if (!habit) return

    const configs = reminderConfigs || habit.reminderConfigs
    if (!configs || configs.length === 0) return

    habit.reminderConfigs = configs.filter((config) => config.enabled)
    await habit.save()

    for (const config of configs) {
      if (!config.enabled) continue

      // Parse time string (HH:MM) and create reminder for today at that time
      const [hours, minutes] = config.reminderTime.split(':').map(Number)
      const now = new Date()
      const triggerTime = new Date()
      triggerTime.setHours(hours, minutes, 0, 0)

      // If time has already passed today, set for tomorrow
      if (triggerTime <= now) {
        triggerTime.setDate(triggerTime.getDate() + 1)
      }

      // Check if a reminder already exists for this habit at this time
      const existingReminder = await Reminder.findOne({
        relatedTo: 'habit',
        relatedId: habit._id,
        triggerTime,
      })

      if (!existingReminder) {
        await Reminder.create({
          user: habit.user,
          title: `Habit Reminder: "${habit.name}"`,
          message: config.message || `Time to complete your habit: "${habit.name}"`,
          relatedTo: 'habit',
          relatedId: habit._id,
          triggerTime,
          isSent: false,
          channel: config.notificationType,
        })
      }
    }
  } catch (error) {
    console.error('Create Habit Reminders Error:', error)
  }
}

/**
 * Delete reminders for a habit
 */
export async function deleteHabitReminders(habitId: string): Promise<void> {
  try {
    await dbConnect()
    await Reminder.deleteMany({ relatedId: new mongoose.Types.ObjectId(habitId) })
  } catch (error) {
    console.error('Delete Habit Reminders Error:', error)
  }
}

/**
 * Create reminders for a time block
 */
export async function createTimeBlockReminders(
  timeBlockId: string,
  reminderConfigs?: IReminderConfig[]
): Promise<void> {
  try {
    await dbConnect()
    const TimeBlock = await import('@/models/TimeBlock')
    const timeBlock = await TimeBlock.default.findById(timeBlockId)
    if (!timeBlock) return

    const configs = reminderConfigs || timeBlock.reminderConfigs
    if (!configs || configs.length === 0) return

    timeBlock.reminderConfigs = configs.filter((config) => config.enabled)
    await timeBlock.save()

    for (const config of configs) {
      if (!config.enabled) continue

      const triggerTime = normalizeReminderTime(new Date(config.reminderTime))
      if (triggerTime > new Date()) {
        await Reminder.create({
          user: timeBlock.user,
          title: `Schedule Reminder: "${timeBlock.title}"`,
          message: config.message || `Your scheduled activity "${timeBlock.title}" is starting soon`,
          relatedTo: 'event',
          relatedId: timeBlock._id,
          triggerTime,
          isSent: false,
          channel: config.notificationType,
        })
      }
    }
  } catch (error) {
    console.error('Create TimeBlock Reminders Error:', error)
  }
}

/**
 * Delete reminders for a time block
 */
export async function deleteTimeBlockReminders(timeBlockId: string): Promise<void> {
  try {
    await dbConnect()
    await Reminder.deleteMany({ relatedId: new mongoose.Types.ObjectId(timeBlockId) })
  } catch (error) {
    console.error('Delete TimeBlock Reminders Error:', error)
  }
}

/**
 * Create reminders for a content idea (release calendar)
 */
export async function createContentReminders(
  contentId: string,
  reminderConfigs?: IReminderConfig[]
): Promise<void> {
  try {
    await dbConnect()
    const ContentIdea = await import('@/models/ContentIdea')
    const content = await ContentIdea.default.findById(contentId)
    if (!content || !content.scheduledDate) return

    const configs = reminderConfigs || content.reminderConfigs
    if (!configs || configs.length === 0) return

    content.reminderConfigs = configs.filter((config) => config.enabled)
    await content.save()

    for (const config of configs) {
      if (!config.enabled) continue

      const triggerTime = normalizeReminderTime(new Date(config.reminderTime))
      if (triggerTime > new Date()) {
        await Reminder.create({
          user: content.user,
          title: `Content Release: "${content.title}" on ${content.platform}`,
          message: config.message || `Your content "${content.title}" is scheduled for release`,
          relatedTo: 'custom',
          relatedId: content._id,
          triggerTime,
          isSent: false,
          channel: config.notificationType,
        })
      }
    }
  } catch (error) {
    console.error('Create Content Reminders Error:', error)
  }
}

/**
 * Delete reminders for a content idea
 */
export async function deleteContentReminders(contentId: string): Promise<void> {
  try {
    await dbConnect()
    await Reminder.deleteMany({ relatedId: new mongoose.Types.ObjectId(contentId) })
  } catch (error) {
    console.error('Delete Content Reminders Error:', error)
  }
}

/**
 * Create reminders for a subject (daily class log)
 */
export async function createSubjectReminders(
  subjectId: string,
  reminderConfigs?: IReminderConfig[]
): Promise<void> {
  try {
    await dbConnect()
    const { Subject } = await import('@/models/College')
    const subject = await Subject.findById(subjectId)
    if (!subject) return

    const configs = reminderConfigs || subject.reminderConfigs
    if (!configs || configs.length === 0) return

    subject.reminderConfigs = configs.filter((config) => config.enabled)
    await subject.save()

    for (const config of configs) {
      if (!config.enabled) continue

      const triggerTime = normalizeReminderTime(new Date(config.reminderTime))
      if (triggerTime > new Date()) {
        await Reminder.create({
          user: subject.user,
          title: `Class Reminder: "${subject.name}"`,
          message: config.message || `Don't forget to log attendance for "${subject.name}"`,
          relatedTo: 'custom',
          relatedId: subject._id,
          triggerTime,
          isSent: false,
          channel: config.notificationType,
        })
      }
    }
  } catch (error) {
    console.error('Create Subject Reminders Error:', error)
  }
}

/**
 * Delete reminders for a subject
 */
export async function deleteSubjectReminders(subjectId: string): Promise<void> {
  try {
    await dbConnect()
    await Reminder.deleteMany({ relatedId: new mongoose.Types.ObjectId(subjectId) })
  } catch (error) {
    console.error('Delete Subject Reminders Error:', error)
  }
}

/**
 * Update reminder configurations for a subject
 */
export async function updateSubjectReminders(
  subjectId: string,
  reminderConfigs: IReminderConfig[]
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    await dbConnect()
    const { Subject } = await import('@/models/College')
    const subject = await Subject.findById(subjectId)
    if (!subject) {
      return { success: false, error: 'Subject not found' }
    }

    // Delete existing reminders for this subject
    await Reminder.deleteMany({ relatedId: new mongoose.Types.ObjectId(subjectId) })

    // Update subject's reminder configs
    subject.reminderConfigs = reminderConfigs.filter((config) => config.enabled)
    await subject.save()

    // Create new reminder documents
    for (const config of reminderConfigs) {
      if (!config.enabled) continue

      const triggerTime = normalizeReminderTime(new Date(config.reminderTime))
      if (triggerTime > new Date()) {
        await Reminder.create({
          user: subject.user,
          title: `Subject Reminder: "${subject.name}"`,
          message: config.message || `Don't forget to log attendance for "${subject.name}"`,
          relatedTo: 'custom',
          relatedId: subject._id,
          triggerTime,
          isSent: false,
          channel: config.notificationType,
        })
      }
    }

    return { success: true, message: 'Subject reminders updated successfully' }
  } catch (error: any) {
    console.error('Update Subject Reminders Error:', error)
    return { success: false, error: error.message || 'Failed to update subject reminders' }
  }
}

export { getReminderPresets, formatMinutesToTime } from '@/lib/reminderUtils'
