import { NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Reminder from '@/models/Reminder'
import User from '@/models/User'
import nodemailer from 'nodemailer'

// Configure SMTP transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
  port: parseInt(process.env.SMTP_PORT || '465'),
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASSWORD || '',
  },
})

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    // 1. Authorization validation (CRON_SECRET security check)
    const { searchParams } = new URL(request.url)
    const clientSecret = searchParams.get('secret') || request.headers.get('Authorization')?.replace('Bearer ', '')
    const serverSecret = process.env.CRON_SECRET

    if (serverSecret && clientSecret !== serverSecret) {
      return NextResponse.json({ error: 'Unauthorized key.' }, { status: 401 })
    }

    await dbConnect()

    const now = new Date()
    
    // Fetch pending active reminders
    const pendingReminders = await Reminder.find({
      isSent: false,
      triggerTime: { $lte: now },
    })

    if (pendingReminders.length === 0) {
      return NextResponse.json({ success: true, message: 'No pending reminders to send.' })
    }

    let processedCount = 0
    let emailSentCount = 0

    for (const reminder of pendingReminders) {
      const user = await User.findById(reminder.user)
      if (!user) {
        // Orphaned reminder, mark as sent to clean up
        reminder.isSent = true
        await reminder.save()
        continue
      }

      // If channels indicate email alerts
      if (reminder.channel === 'email' || reminder.channel === 'both') {
        const mailOptions = {
          from: `"Solo Leveling Notifications" <${process.env.SMTP_FROM || 'noreply@sololeveling.com'}>`,
          to: user.email,
          subject: 'Task Alert - Solo Leveling Dashboard',
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px; background-color: #ffffff; color: #333333;">
              <h2 style="color: #4f46e5; text-align: center;">Task Alert</h2>
              <p>Hello ${user.name},</p>
              <p>This is an automated notification reminding you of your schedule:</p>
              <div style="background-color: #f9fafb; padding: 15px; border-left: 4px solid #4f46e5; border-radius: 4px; margin: 20px 0; font-size: 16px;">
                <strong>${reminder.title}</strong>
              </div>
              <p>Please log in to your dashboard to complete your tasks and level up your skills.</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.NEXTAUTH_URL || 'https://sololeveling.vercel.app/'}/dashboard" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Open Dashboard</a>
              </div>
              <hr style="border: 0; border-top: 1px solid #eee; margin-top: 30px;" />
              <p style="font-size: 12px; color: #999; text-align: center;">You received this email because you enabled reminders for a task or assignment. If this wasn't you, ignore this message.</p>
            </div>
          `,
        }

        if (process.env.SMTP_USER && process.env.SMTP_PASSWORD) {
          try {
            await transporter.sendMail(mailOptions)
            emailSentCount++
          } catch (err) {
            console.error(`Failed to send email reminder for user ${user.email}:`, err)
            // Continue processing other alerts even if one email fails
          }
        } else {
          // Fallback console log for development
          console.log('\n=======================================')
          console.log('--- EMAIL CRON REMINDER TRIGGERED ---')
          console.log(`To: ${user.email}`)
          console.log(`Reminder Text: ${reminder.title}`)
          console.log('=======================================\n')
          emailSentCount++
        }
      }

      reminder.isSent = true
      await reminder.save()
      processedCount++
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${processedCount} reminder(s). Sent ${emailSentCount} email(s).`,
    })
  } catch (error: any) {
    console.error('Cron Reminders API Error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
