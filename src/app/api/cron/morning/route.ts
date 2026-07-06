import { NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import { processPendingReminders } from '@/services/reminderService'
import runInBackground from '@/lib/cronHelper'
import Habit from '@/models/Habit'
import Invoice from '@/models/Invoice'
import Project from '@/models/Project'
import User from '@/models/User'
import Reminder from '@/models/Reminder'
import { Assignment, Exam } from '@/models/College'
import { sendDailyHabitReminder, sendInvoiceDueReminder, sendDeletionConfirmationEmail } from '@/services/emailService'

export const dynamic = 'force-dynamic'

interface ProcessingResult {
  remindersProcessed: number
  remindersSent: number
  remindersFailed: number
  habitReminders: number
  invoiceReminders: number
  projectReminders: number
  deletionRequestsSent: number
  errors: string[]
}

// Instantiate the reusable nodemailer pooled transporter once outside iterative loop contexts
const nodemailer = require('nodemailer')
const hasSmtpCredentials = !!(process.env.SMTP_USER && process.env.SMTP_PASSWORD)

const transporter = hasSmtpCredentials
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
      port: parseInt(process.env.SMTP_PORT || '465'),
      pool: true, // Enable high-concurrency connection pooling
      maxConnections: 20, // Max concurrent sockets to open
      maxMessages: Infinity, // Maintain persistent socket lifespan
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    })
  : null

export async function GET(request: Request) {
  const result: ProcessingResult = {
    remindersProcessed: 0,
    remindersSent: 0,
    remindersFailed: 0,
    habitReminders: 0,
    invoiceReminders: 0,
    projectReminders: 0,
    deletionRequestsSent: 0,
    errors: [],
  }

  try {
    // Authorization validation - accept Bearer or X-Cron-Secret header for compatibility
    const authHeader = request.headers.get('authorization')
    const headerSecret = request.headers.get('x-cron-secret')
    const serverSecret = process.env.CRON_SECRET

    const isAuthorized = (authHeader && authHeader === `Bearer ${serverSecret}`) || (headerSecret && headerSecret === serverSecret)
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Immediately respond to the cron caller and run the heavy work in background
    const bgTask = async () => {
      // Open secure database connection pool
      await dbConnect()

      const startTime = Date.now()
      try {
        const now = new Date()
        const currentTime = now.getTime()

        // Process pending reminders using the reminder service (handles new reminderConfigs system)
        const reminderResult = await processPendingReminders()
        result.remindersProcessed = reminderResult.processed
        result.remindersSent = reminderResult.sent
        result.remindersFailed = reminderResult.failed

        // ==================== 1. DAILY HABIT REMINDERS (Legacy support for users without reminderConfigs) ====================
        try {
          const users = await User.find({}).select('_id email name lastHabitReminderDate').lean()
          const todayStr = now.toISOString().split('T')[0]

          await Promise.all(
            users.map(async (user: any) => {
              try {
                const habits = await Habit.find({ user: user._id }).select('_id name reminderConfigs').lean()
                if (habits.length === 0) return

                const hasHabitReminders = habits.some((h: any) => Array.isArray(h.reminderConfigs) && h.reminderConfigs.length > 0)
                if (hasHabitReminders) return

                const lastEmailDate = user.lastHabitReminderDate ? new Date(user.lastHabitReminderDate) : null
                const lastEmailDay = lastEmailDate ? lastEmailDate.toISOString().split('T')[0] : null

                if (lastEmailDay === todayStr) return

                const habitNames = habits.map((h: any) => h.name)
                await sendDailyHabitReminder(user.email, user.name, habitNames)

                // Update user record without needing a full document save
                await User.updateOne({ _id: user._id }, { $set: { lastHabitReminderDate: now } })
                result.habitReminders++
              } catch (singleHabitErr: any) {
                result.errors.push(`Habit user context error (${user.email || user._id}): ${singleHabitErr.message}`)
              }
            })
          )
        } catch (err: any) {
          result.errors.push(`Habit reminders error: ${err.message}`)
        }

        // ==================== 2. INVOICE DUE REMINDERS ====================
        try {
          const invoices = await Invoice.find({
            status: 'Unpaid',
            reminderSent: false,
            dueDate: {
              $lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
              $gte: now,
            },
          }).select('_id user amount dueDate clientName').populate('user', '_id email name').lean()

          await Promise.all(
            invoices.map(async (invoice: any) => {
              try {
                const user = invoice.user as any
                if (!user) return

                await sendInvoiceDueReminder(user.email, user.name, invoice.amount, invoice.dueDate!, invoice.clientName)

                // Mark as sent via updateOne instead of document.save()
                await Invoice.updateOne({ _id: invoice._id }, { $set: { reminderSent: true } })
                result.invoiceReminders++
              } catch (singleInvoiceErr: any) {
                result.errors.push(`Invoice context error (ID ${invoice._id}): ${singleInvoiceErr.message}`)
              }
            })
          )
        } catch (err: any) {
          result.errors.push(`Invoice reminders error: ${err.message}`)
        }

        // ==================== 3. PROJECT DEADLINE REMINDERS (legacy pathway) ====================
        try {
          const projects = await Project.find({
            deadline: {
              $lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
              $gte: now,
            },
            reminderSent: false,
          }).select('_id user title deadline').populate('user', '_id email name').lean()

          await Promise.all(
            projects.map(async (project: any) => {
              try {
                const user = project.user as any
                if (!user || !user.email) return

                const hasProjectReminderDoc = await Reminder.exists({
                  relatedTo: 'project',
                  relatedId: project._id,
                })

                if (hasProjectReminderDoc) {
                  return
                }

                const daysUntil = Math.ceil((new Date(project.deadline!).getTime() - currentTime) / (24 * 60 * 60 * 1000))

                const mailOptions = {
                  from: `"Solo Leveling Projects" <${process.env.SMTP_FROM || 'noreply@sololeveling.com'}>`,
                  to: user.email,
                  subject: `🚀 Project Deadline Reminder: ${project.title}`,
                  html: `...`,
                }

                if (transporter) {
                  try {
                    await transporter.sendMail(mailOptions)
                  } catch (err: any) {
                    console.error(`Failed to send project reminder for ${user.email}:`, err)
                    result.errors.push(`SMTP transfer error (${user.email}): ${err.message}`)
                  }
                } else {
                  console.log(`--- PROJECT REMINDER FALLBACK --- To: ${user.email} | Project: ${project.title}`)
                }

                await Project.updateOne({ _id: project._id }, { $set: { reminderSent: true } })
                result.projectReminders++
              } catch (singleProjectErr: any) {
                result.errors.push(`Project context error (ID ${project._id}): ${singleProjectErr.message}`)
              }
            })
          )
        } catch (err: any) {
          result.errors.push(`Project reminders error: ${err.message}`)
        }

        // ==================== 4. COLLEGE DEADLINE COMPLETION CHECKS ====================
        try {
          const pastDueAssignments = await Assignment.find({
            dueDate: { $lt: now },
            deletionRequested: false,
            status: { $ne: 'Completed' },
          }).select('_id user title').populate('user', '_id email name').lean()

          await Promise.all(
            pastDueAssignments.map(async (assignment: any) => {
              try {
                const user = assignment.user as any
                if (!user || !user.email) return

                await Assignment.updateOne({ _id: assignment._id }, { $set: { deletionRequested: true, deletionRequestedAt: now } })

                await sendDeletionConfirmationEmail(
                  user.email,
                  user.name || 'User',
                  'assignment',
                  assignment.title,
                  assignment._id.toString()
                )

                result.deletionRequestsSent++
              } catch (singleAssignmentErr: any) {
                result.errors.push(`Assignment deletion request error (ID ${assignment._id}): ${singleAssignmentErr.message}`)
              }
            })
          )

          const pastDueExams = await Exam.find({
            date: { $lt: now },
            deletionRequested: false,
          }).select('_id user examType').populate('user', '_id email name').lean()

          await Promise.all(
            pastDueExams.map(async (exam: any) => {
              try {
                const user = exam.user as any
                if (!user || !user.email) return

                await Exam.updateOne({ _id: exam._id }, { $set: { deletionRequested: true, deletionRequestedAt: now } })

                await sendDeletionConfirmationEmail(
                  user.email,
                  user.name || 'User',
                  'exam',
                  exam.examType,
                  exam._id.toString()
                )

                result.deletionRequestsSent++
              } catch (singleExamErr: any) {
                result.errors.push(`Exam deletion request error (ID ${exam._id}): ${singleExamErr.message}`)
              }
            })
          )
        } catch (err: any) {
          result.errors.push(`College deadline completion check error: ${err.message}`)
        }

        // Optionally log runtime
        const duration = Date.now() - startTime
        console.log(`Morning cron background task completed in ${duration}ms`, result)
      } catch (err: any) {
        console.error('Error in morning cron background task:', err)
      }
    }

    // Schedule background task using helper then return immediately
    runInBackground(bgTask).catch(() => null)
    return NextResponse.json({ success: true, scheduled: true, message: 'Morning task scheduled.' })
  } catch (error: any) {
    console.error('Morning Cron Error:', error)
    result.errors.push(error.message || 'Internal Server Error')
    return NextResponse.json(
      { error: error.message || 'Internal Server Error', result },
      { status: 500 }
    )
  }
}
