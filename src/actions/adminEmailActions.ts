'use server'

import nodemailer from 'nodemailer'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/mongodb'
import Reminder from '@/models/Reminder'
import User from '@/models/User'
import { logAdminAction } from '@/services/auditLogService'

// Nodemailer transporter initialization
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
  port: parseInt(process.env.SMTP_PORT || '465'),
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASSWORD || '',
  },
})

async function checkAdminAuth() {
  const session = await getServerSession(authOptions)
  if (!session || !session.user || session.user.role !== 'admin') {
    throw new Error('Unauthorized: Admin access required')
  }
  return session
}

export interface EmailLog {
  id: string
  userName: string
  userEmail: string
  subject: string
  triggerTime: string
  isSent: boolean
  channel: string
}

/**
 * Queries sent or failed email triggers from the Reminders database.
 */
export async function fetchAdminEmailLogs(options: {
  search?: string
  status?: 'all' | 'sent' | 'failed'
  page?: number
  limit?: number
}): Promise<{ logs: EmailLog[]; total: number; pages: number }> {
  await checkAdminAuth()
  await dbConnect()

  const page = options.page || 1
  const limit = options.limit || 10
  const skip = (page - 1) * limit

  const filter: any = { channel: { $in: ['both', 'email'] } }

  // Status query
  if (options.status === 'sent') {
    filter.isSent = true
  } else if (options.status === 'failed') {
    filter.isSent = false
    // Failed are those with triggerTime in the past but not sent
    filter.triggerTime = { $lt: new Date() }
  }

  // Populate users in query
  const rawReminders = await Reminder.find(filter)
    .sort({ triggerTime: -1 })
    .skip(skip)
    .limit(limit)
    .populate('user', 'name email')
    .exec()

  const total = await Reminder.countDocuments(filter)

  // Map to logs structure, supporting search string matching
  let logs = rawReminders.map((r: any) => ({
    id: r._id.toString(),
    userName: r.user?.name || 'Deleted User',
    userEmail: r.user?.email || 'Unknown',
    subject: r.title,
    triggerTime: r.triggerTime.toISOString(),
    isSent: r.isSent,
    channel: r.channel,
  }))

  if (options.search) {
    const s = options.search.toLowerCase()
    logs = logs.filter(
      (l) =>
        l.userName.toLowerCase().includes(s) ||
        l.userEmail.toLowerCase().includes(s) ||
        l.subject.toLowerCase().includes(s)
    )
  }

  return {
    logs,
    total,
    pages: Math.ceil(total / limit),
  }
}

/**
 * Resends a failed email notification via Nodemailer.
 */
export async function resendFailedEmailAction(
  reminderId: string
): Promise<{ success: boolean; error?: string }> {
  const session = await checkAdminAuth()
  await dbConnect()

  try {
    const reminder = await Reminder.findById(reminderId).populate('user', 'name email')
    if (!reminder) {
      return { success: false, error: 'Email record not found.' }
    }

    const recipientEmail = (reminder.user as any)?.email
    const recipientName = (reminder.user as any)?.name || 'Member'

    if (!recipientEmail) {
      return { success: false, error: 'Recipient user account does not have a valid email.' }
    }

    // Direct Nodemailer send check
    const mailOptions = {
      from: `"Solo Leveling" <${process.env.SMTP_FROM || 'noreply@sololeveling.com'}>`,
      to: recipientEmail,
      subject: `⏰ Resend: ${reminder.title}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px; background-color: #ffffff; color: #333333;">
          <h2 style="color: #4f46e5; text-align: center;">Task Reminder</h2>
          <p>Hello ${recipientName},</p>
          <p>This is a re-sent reminder regarding your active Solo Leveling objective:</p>
          <div style="background-color: #f3f4f6; padding: 15px; border-left: 4px solid #4f46e5; border-radius: 4px; margin: 20px 0;">
            <strong style="font-size: 16px;">${reminder.title}</strong>
          </div>
          <p>Please check your dashboard to complete the objective.</p>
        </div>
      `,
    }

    if (process.env.SMTP_USER && process.env.SMTP_PASSWORD) {
      await transporter.sendMail(mailOptions)
    } else {
      console.log(`[SMTP resend fallback] To: ${recipientEmail}, Title: ${reminder.title}`)
    }

    // Mark as sent
    reminder.isSent = true
    await reminder.save()

    await logAdminAction(session.user.id, {
      action: 'RESEND_NOTIFICATION_EMAIL',
      target: reminderId,
      collectionName: 'Reminder',
      details: `Re-sent notification: "${reminder.title}" to ${recipientEmail}`,
      result: 'Success',
    })

    return { success: true }
  } catch (error: any) {
    console.error('Resend email error:', error)
    return { success: false, error: error.message || 'Failed to dispatch email.' }
  }
}

/**
 * Triggers a custom email announcement broadcast to a cohort of active users.
 */
export async function sendAnnouncementEmailAction(options: {
  subject: string
  htmlBody: string
  recipientGroup: 'all' | 'admins' | 'users'
}): Promise<{ success: boolean; count?: number; error?: string }> {
  const session = await checkAdminAuth()
  await dbConnect()

  try {
    const query: any = { status: { $ne: 'suspended' } }
    if (options.recipientGroup === 'admins') {
      query.role = 'admin'
    } else if (options.recipientGroup === 'users') {
      query.role = 'user'
    }

    const recipients = await User.find(query).select('name email')
    if (recipients.length === 0) {
      return { success: false, error: 'No active accounts found in the selected group.' }
    }

    let sentCount = 0
    for (const user of recipients) {
      const mailOptions = {
        from: `"Solo Leveling Announcements" <${process.env.SMTP_FROM || 'noreply@sololeveling.com'}>`,
        to: user.email,
        subject: options.subject,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px; background-color: #ffffff; color: #333333;">
            <h2 style="color: #6366f1; text-align: center;">Platform Notice</h2>
            <p>Hello ${user.name},</p>
            <div style="margin: 20px 0; line-height: 1.6;">
              ${options.htmlBody}
            </div>
            <hr style="border: 0; border-top: 1px solid #eee; margin-top: 30px;" />
            <p style="font-size: 11px; color: #999; text-align: center;">Solo Leveling Gamified Console System.</p>
          </div>
        `,
      }

      if (process.env.SMTP_USER && process.env.SMTP_PASSWORD) {
        await transporter.sendMail(mailOptions)
      }
      sentCount++
    }

    await logAdminAction(session.user.id, {
      action: 'BROADCAST_EMAIL_ANNOUNCEMENT',
      collectionName: 'User',
      details: `Dispatched announcement: "${options.subject}" to ${sentCount} recipients in group: ${options.recipientGroup}`,
      result: 'Success',
    })

    return { success: true, count: sentCount }
  } catch (error: any) {
    console.error('Email announcement broadcast error:', error)
    return { success: false, error: error.message || 'Failed to dispatch cohort emails.' }
  }
}
