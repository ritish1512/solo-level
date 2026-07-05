import { NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import { processPendingReminders } from '@/services/reminderService'
import Habit from '@/models/Habit'
import Invoice from '@/models/Invoice'
import Project from '@/models/Project'
import User from '@/models/User'
import { sendDailyHabitReminder, sendInvoiceDueReminder } from '@/services/emailService'

export const dynamic = 'force-dynamic'

interface ProcessingResult {
  remindersProcessed: number
  remindersSent: number
  remindersFailed: number
  habitReminders: number
  invoiceReminders: number
  projectReminders: number
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
    errors: [],
  }

  try {
    // Authorization validation - check bearer token
    const authHeader = request.headers.get('authorization')
    const serverSecret = process.env.CRON_SECRET

    if (!authHeader || authHeader !== `Bearer ${serverSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Open secure database connection pool
    await dbConnect()

    const now = new Date()
    const currentTime = now.getTime()

    // Process pending reminders using the reminder service (handles new reminderConfigs system)
    const reminderResult = await processPendingReminders()
    result.remindersProcessed = reminderResult.processed
    result.remindersSent = reminderResult.sent
    result.remindersFailed = reminderResult.failed

    // ==================== 1. DAILY HABIT REMINDERS (Legacy support for users without reminderConfigs) ====================
    try {
      const users = await User.find({})
      const todayStr = now.toISOString().split('T')[0]

      // Process users concurrently using Promise.all
      await Promise.all(
        users.map(async (user) => {
          try {
            const habits = await Habit.find({ user: user._id })
            if (habits.length === 0) return

            const lastEmailDate = user.lastHabitReminderDate ? new Date(user.lastHabitReminderDate) : null
            const lastEmailDay = lastEmailDate ? lastEmailDate.toISOString().split('T')[0] : null

            if (lastEmailDay === todayStr) return

            const habitNames = habits.map((h) => h.name)
            await sendDailyHabitReminder(user.email, user.name, habitNames)

            user.lastHabitReminderDate = now
            await user.save()
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
          $lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // Within 7 days
          $gte: now,
        },
      }).populate('user')

      // Process invoices concurrently using Promise.all
      await Promise.all(
        invoices.map(async (invoice) => {
          try {
            const user = invoice.user as any
            if (!user) return

            await sendInvoiceDueReminder(user.email, user.name, invoice.amount, invoice.dueDate!, invoice.clientName)
            
            invoice.reminderSent = true
            await invoice.save()
            result.invoiceReminders++
          } catch (singleInvoiceErr: any) {
            result.errors.push(`Invoice context error (ID ${invoice._id}): ${singleInvoiceErr.message}`)
          }
        })
      )
    } catch (err: any) {
      result.errors.push(`Invoice reminders error: ${err.message}`)
    }

    // ==================== 3. PROJECT DEADLINE REMINDERS ====================
    try {
      const projects = await Project.find({
        deadline: {
          $lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // Within 7 days
          $gte: now,
        },
        reminderSent: false,
      }).populate('user')

      // Process projects concurrently using Promise.all
      await Promise.all(
        projects.map(async (project) => {
          try {
            const user = project.user as any
            if (!user) return

            const daysUntil = Math.ceil((new Date(project.deadline!).getTime() - currentTime) / (24 * 60 * 60 * 1000))
            
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
                  <p>Ensure your project is on track. Review details in the dashboard.</p>
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${process.env.NEXTAUTH_URL || 'https://sololevelingguider.vercel.app/'}/dashboard/projects" style="background-color: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">View Projects</a>
                  </div>
                  <hr style="border: 0; border-top: 1px solid #eee; margin-top: 30px;" />
                  <p style="font-size: 12px; color: #999; text-align: center;">Project deadline reminder from Solo Leveling.</p>
                </div>
              `,
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

            project.reminderSent = true
            await project.save()
            result.projectReminders++
          } catch (singleProjectErr: any) {
            result.errors.push(`Project context error (ID ${project._id}): ${singleProjectErr.message}`)
          }
        })
      )
    } catch (err: any) {
      result.errors.push(`Project reminders error: ${err.message}`)
    }

    return NextResponse.json({
      success: true,
      message: 'Morning daily notifications processed successfully.',
      result,
    })

  } catch (error: any) {
    console.error('Morning Cron Error:', error)
    result.errors.push(error.message || 'Internal Server Error')
    return NextResponse.json(
      { error: error.message || 'Internal Server Error', result },
      { status: 500 }
    )
  }
}
