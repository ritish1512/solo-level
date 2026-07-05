import { NextResponse } from 'next/server'
import { processPendingReminders } from '@/services/reminderService'
import dbConnect from '@/lib/mongodb'
import Task from '@/models/Task'
import TimeBlock from '@/models/TimeBlock'
import Habit from '@/models/Habit'
import Invoice from '@/models/Invoice'
import Project from '@/models/Project'
import User from '@/models/User'
import ContentIdea from '@/models/ContentIdea'
import {
  sendTaskDeadlineReminder,
  sendScheduledContentReminder,
  sendTimeBlockNotification,
  sendDailyHabitReminder,
  sendInvoiceDueReminder,
} from '@/services/emailService'

export const dynamic = 'force-dynamic'

interface ProcessingResult {
  reminderProcessed: number
  reminderSent: number
  reminderFailed: number
  taskReminders: number
  timeBlockReminders: number
  habitReminders: number
  invoiceReminders: number
  projectReminders: number
  contentReminders: number
  errors: string[]
}

export async function GET(request: Request) {
  const result: ProcessingResult = {
    reminderProcessed: 0,
    reminderSent: 0,
    reminderFailed: 0,
    taskReminders: 0,
    timeBlockReminders: 0,
    habitReminders: 0,
    invoiceReminders: 0,
    projectReminders: 0,
    contentReminders: 0,
    errors: [],
  }

  try {
    // Authorization validation
    const { searchParams } = new URL(request.url)
    const clientSecret = searchParams.get('secret') || request.headers.get('Authorization')?.replace('Bearer ', '')
    const serverSecret = process.env.CRON_SECRET

    if (serverSecret && clientSecret !== serverSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Process pending reminders (from the original reminders cron)
    try {
      const reminderResult = await processPendingReminders()
      result.reminderProcessed = reminderResult.processed
      result.reminderSent = reminderResult.sent
      result.reminderFailed = reminderResult.failed
    } catch (err: any) {
      result.errors.push(`Reminder processing error: ${err.message}`)
    }

    await dbConnect()

    // ==================== TASK DEADLINE REMINDERS ====================
    try {
      const now = new Date()
      const tasks = await Task.find({
        reminderOffset: { $gt: 0 },
        reminderSent: false,
        status: { $ne: 'Completed' },
      }).populate('user')

      for (const task of tasks) {
        const user = task.user as any
        if (!user) continue

        const deadlineTime = new Date(task.deadline).getTime()
        const reminderTime = deadlineTime - (task.reminderOffset ?? 0) * 60 * 1000
        const currentTime = now.getTime()

        // Check if it's time to send the reminder (within 30 minutes window to account for 30-min cron frequency)
        if (currentTime >= reminderTime && currentTime < deadlineTime && currentTime - reminderTime < 30 * 60 * 1000) {
          const hoursUntil = Math.ceil((deadlineTime - currentTime) / (1000 * 60 * 60))
          await sendTaskDeadlineReminder(user.email, user.name, task.title, task.deadline, hoursUntil)
          task.reminderSent = true
          await task.save()
          result.taskReminders++
        }
      }
    } catch (err: any) {
      result.errors.push(`Task reminders error: ${err.message}`)
    }

    // ==================== TIMEBLOCK REMINDERS ====================
    try {
      const now = new Date()
      const today = now.toISOString().split('T')[0]
      const currentHour = now.getHours().toString().padStart(2, '0')
      const currentMinute = now.getMinutes().toString().padStart(2, '0')
      const currentTime = `${currentHour}:${currentMinute}`

      // Get timeblocks starting within the next 30 minutes
      const timeBlocks = await TimeBlock.find({
        date: today,
        isCompleted: false,
      }).populate('user')

      for (const timeBlock of timeBlocks) {
        const user = timeBlock.user as any
        if (!user) continue

        const [blockHour, blockMinute] = timeBlock.startTime.split(':')
        const blockTotalMinutes = parseInt(blockHour) * 60 + parseInt(blockMinute)
        const currentTotalMinutes = parseInt(currentHour) * 60 + parseInt(currentMinute)
        const minutesUntilStart = blockTotalMinutes - currentTotalMinutes

        // Send reminder 15 minutes before start time (with 30-minute window for cron frequency)
        if (minutesUntilStart > 0 && minutesUntilStart <= 30) {
          await sendTimeBlockNotification(user.email, user.name, timeBlock.title, timeBlock.startTime, timeBlock.date)
          result.timeBlockReminders++
        }
      }
    } catch (err: any) {
      result.errors.push(`TimeBlock reminders error: ${err.message}`)
    }

    // ==================== SCHEDULED CONTENT REMINDERS ====================
    try {
      const now = new Date()
      // Look for content scheduled in the next 4 hours
      const fourHoursLater = new Date(now.getTime() + 4 * 60 * 60 * 1000)

      const scheduledContent = await ContentIdea.find({
        scheduledDate: { $gte: now, $lte: fourHoursLater },
      }).populate('user')

      for (const content of scheduledContent) {
        const user = content.user as any
        if (!user) continue

        // Send once per day only
        const lastEmailDate = content.lastReminderSentAt ? new Date(content.lastReminderSentAt) : null
        if (lastEmailDate && now.getTime() - lastEmailDate.getTime() < 24 * 60 * 60 * 1000) {
          continue
        }

        await sendScheduledContentReminder(user.email, user.name, content.title, content.platform, content.scheduledDate ?? now)
        content.lastReminderSentAt = now
        await content.save()
        result.contentReminders++
      }
    } catch (err: any) {
      result.errors.push(`Content reminders error: ${err.message}`)
    }

    // ==================== DAILY HABIT REMINDERS ====================
    try {
      const now = new Date()
      // Get all users
      const users = await User.find({})

      for (const user of users) {
        // Find all habits for this user
        const habits = await Habit.find({ user: user._id })
        if (habits.length === 0) continue

        // Check if reminder was already sent today
        const lastEmailDate = user.lastHabitReminderDate ? new Date(user.lastHabitReminderDate) : null
        const today = now.toISOString().split('T')[0]
        const lastEmailDay = lastEmailDate ? new Date(lastEmailDate).toISOString().split('T')[0] : null

        if (lastEmailDay === today) continue

        // Send on or after 8 AM (prevented from repeating today by user.lastHabitReminderDate checks)
        if (now.getHours() >= 8) {
          const habitNames = habits.map((h) => h.name)
          await sendDailyHabitReminder(user.email, user.name, habitNames)
          user.lastHabitReminderDate = now
          await user.save()
          result.habitReminders++
        }
      }
    } catch (err: any) {
      result.errors.push(`Habit reminders error: ${err.message}`)
    }

    // ==================== INVOICE DUE REMINDERS ====================
    try {
      const now = new Date()
      const invoices = await Invoice.find({
        status: 'Unpaid',
        reminderSent: false,
        dueDate: {
          $lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // Within 7 days
          $gte: now, // Not past due
        },
      }).populate('user')

      for (const invoice of invoices) {
        const user = invoice.user as any
        if (!user) continue

        await sendInvoiceDueReminder(user.email, user.name, invoice.amount, invoice.dueDate!, invoice.clientName)
        invoice.reminderSent = true
        await invoice.save()
        result.invoiceReminders++
      }
    } catch (err: any) {
      result.errors.push(`Invoice reminders error: ${err.message}`)
    }

    // ==================== PROJECT DEADLINE REMINDERS ====================
    try {
      const now = new Date()
      const projects = await Project.find({
        deadline: {
          $lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // Within 7 days
          $gte: now, // Not past due
        },
        reminderSent: false,
      }).populate('user')

      for (const project of projects) {
        const user = project.user as any
        if (!user) continue

        const daysUntil = Math.ceil((new Date(project.deadline!).getTime() - now.getTime()) / (24 * 60 * 60 * 1000))

        // Simplified project reminder (reuse task reminder template)
        const mailOptions = {
          from: `"Solo Leveling Projects" <${process.env.SMTP_FROM || 'noreply@sololeveling.com'}>`,
          to: user.email,
          subject: `🚀 Project Deadline Reminder: ${project.title}`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px; background-color: #ffffff; color: #333333;">
              <h2 style="color: #7c3aed; text-align: center;">🚀 Project Deadline Reminder</h2>
              <p>Hello ${user.name},</p>
              <p>Your project deadline is approaching:</p>
              <div style="background-color: #f5f3ff; padding: 15px; border-left: 4px solid #7c3aed; border-radius: 4px; margin: 20px 0;">
                <strong style="font-size: 16px;">${project.title}</strong>
                <p style="margin: 10px 0 0 0; color: #5b21b6;">📅 Days remaining: ${daysUntil}</p>
              </div>
              <p>Ensure your project is on track and all deliverables are ready. Review your project details in the dashboard.</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.NEXTAUTH_URL || 'https://sololevelingguider.vercel.app/'}/dashboard/projects" style="background-color: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">View Projects</a>
              </div>
              <hr style="border: 0; border-top: 1px solid #eee; margin-top: 30px;" />
              <p style="font-size: 12px; color: #999; text-align: center;">This is a project deadline reminder from Solo Leveling.</p>
            </div>
          `,
        }

        // Send email
        if (process.env.SMTP_USER && process.env.SMTP_PASSWORD) {
          try {
            const nodemailer = require('nodemailer')
            const transporter = nodemailer.createTransport({
              host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
              port: parseInt(process.env.SMTP_PORT || '465'),
              auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASSWORD,
              },
            })
            await transporter.sendMail(mailOptions)
          } catch (err) {
            console.error(`Failed to send project reminder for ${user.email}:`, err)
          }
        } else {
          console.log('\n=======================================')
          console.log('--- PROJECT REMINDER FALLBACK ---')
          console.log(`To: ${user.email}`)
          console.log(`Project: ${project.title}`)
          console.log('=======================================\n')
        }

        project.reminderSent = true
        await project.save()
        result.projectReminders++
      }
    } catch (err: any) {
      result.errors.push(`Project reminders error: ${err.message}`)
    }

    return NextResponse.json({
      success: true,
      message: 'Consolidated cron job completed successfully',
      result,
    })
  } catch (error: any) {
    console.error('Consolidated Cron Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal Server Error', result },
      { status: 500 }
    )
  }
}
