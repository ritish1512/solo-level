import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
  port: parseInt(process.env.SMTP_PORT || '465'),
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASSWORD || '',
  },
})

const siteUrl = process.env.NEXTAUTH_URL || 'https://sololevelingguider.vercel.app/'

export async function sendVerificationEmail(email: string, name: string, token: string) {
  const verificationUrl = `${siteUrl}/verify?token=${token}&email=${encodeURIComponent(email)}`

  const mailOptions = {
    from: `"Solo Leveling" <${process.env.SMTP_FROM || 'noreply@sololeveling.com'}>`,
    to: email,
    subject: 'Verify Your Email - Solo Leveling Dashboard',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px; background-color: #ffffff; color: #333333;">
        <h2 style="color: #4f46e5; text-align: center;">Welcome to Solo Leveling, ${name}!</h2>
        <p>You have registered for your personal productivity dashboard. Please verify your email by clicking the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Verify Email Address</a>
        </div>
        <p>If you cannot click the button above, copy and paste this URL into your browser:</p>
        <p style="color: #666; word-break: break-all;">${verificationUrl}</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin-top: 30px;" />
        <p style="font-size: 12px; color: #999; text-align: center;">This email was sent because you registered on Solo Leveling Dashboard. If this wasn't you, please ignore this email.</p>
      </div>
    `,
  }

  // Fallback if SMTP details aren't provided
  if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    console.log('\n=======================================')
    console.log('--- EMAIL VERIFICATION FALLBACK ---')
    console.log(`To: ${email}`)
    console.log(`Verification URL: ${verificationUrl}`)
    console.log('=======================================\n')
    return { success: true, logged: true }
  }

  try {
    await transporter.sendMail(mailOptions)
    return { success: true }
  } catch (error) {
    console.error('Failed to send verification email:', error)
    return { success: false, error }
  }
}

export async function sendResetPasswordEmail(email: string, name: string, token: string) {
  const resetUrl = `${siteUrl}/reset-password?token=${token}&email=${encodeURIComponent(email)}`

  const mailOptions = {
    from: `"Solo Leveling" <${process.env.SMTP_FROM || 'noreply@sololeveling.com'}>`,
    to: email,
    subject: 'Reset Your Password - Solo Leveling Dashboard',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px; background-color: #ffffff; color: #333333;">
        <h2 style="color: #dc2626; text-align: center;">Reset Your Password</h2>
        <p>Hello ${name},</p>
        <p>We received a request to reset your password. Click the button below to choose a new password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Reset Password</a>
        </div>
        <p>If you did not request this, please ignore this email. Your password will remain unchanged.</p>
        <p>This reset link will expire in 1 hour.</p>
        <p>If you cannot click the button above, copy and paste this URL into your browser:</p>
        <p style="color: #666; word-break: break-all;">${resetUrl}</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin-top: 30px;" />
        <p style="font-size: 12px; color: #999; text-align: center;">This email was sent because you requested a password reset on Solo Leveling. If this wasn't you, please ignore this email.</p>
      </div>
    `,
  }

  // Fallback if SMTP details aren't provided
  if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    console.log('\n=======================================')
    console.log('--- PASSWORD RESET FALLBACK ---')
    console.log(`To: ${email}`)
    console.log(`Reset URL: ${resetUrl}`)
    console.log('=======================================\n')
    return { success: true, logged: true }
  }

  try {
    await transporter.sendMail(mailOptions)
    return { success: true }
  } catch (error) {
    console.error('Failed to send password reset email:', error)
    return { success: false, error }
  }
}

// ==================== TIME-BASED NOTIFICATIONS ====================

export async function sendTaskDeadlineReminder(email: string, name: string, taskTitle: string, deadline: Date, hoursUntil: number, customMessage?: string) {
  const formattedDeadline = new Date(deadline).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const mailOptions = {
    from: `"Solo Leveling Notifications" <${process.env.SMTP_FROM || 'noreply@sololeveling.com'}>`,
    to: email,
    subject: `⏰ Task Reminder: ${taskTitle}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px; background-color: #ffffff; color: #333333;">
        <h2 style="color: #f59e0b; text-align: center;">⏰ Task Deadline Reminder</h2>
        <p>Hello ${name},</p>
        <p>This is a friendly reminder that you have an upcoming task deadline:</p>
        <div style="background-color: #fffbeb; padding: 15px; border-left: 4px solid #f59e0b; border-radius: 4px; margin: 20px 0;">
          <strong style="font-size: 16px;">${taskTitle}</strong>
          <p style="margin: 10px 0 0 0; color: #92400e;">📅 Due: ${formattedDeadline}</p>
          <p style="margin: 5px 0 0 0; color: #92400e;">⏱️ Time remaining: ${hoursUntil} hours</p>
        </div>
        ${customMessage ? `<p style="margin: 15px 0; padding: 10px; background-color: #fef3c7; border-radius: 4px; color: #92400e;">💬 ${customMessage}</p>` : ''}
        <p>Don't miss this deadline! Complete your task now to stay on track with your goals.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${siteUrl}/dashboard/tasks" style="background-color: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">View Task</a>
        </div>
        <hr style="border: 0; border-top: 1px solid #eee; margin-top: 30px;" />
        <p style="font-size: 12px; color: #999; text-align: center;">This is an automated reminder from Solo Leveling. You can manage your notification preferences in dashboard settings.</p>
      </div>
    `,
  }

  return sendEmailSafely(mailOptions)
}

export async function sendScheduledContentReminder(email: string, name: string, contentTitle: string, platform: string, scheduledDate: Date, customMessage?: string) {
  const formattedDate = new Date(scheduledDate).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const mailOptions = {
    from: `"Solo Leveling Creator Hub" <${process.env.SMTP_FROM || 'noreply@sololeveling.com'}>`,
    to: email,
    subject: `🚀 Content Alert: Time to Post on ${platform}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px; background-color: #ffffff; color: #333333;">
        <h2 style="color: #10b981; text-align: center;">🚀 Content Scheduling Reminder</h2>
        <p>Hello ${name},</p>
        <p>Your scheduled content is ready to be posted:</p>
        <div style="background-color: #ecfdf5; padding: 15px; border-left: 4px solid #10b981; border-radius: 4px; margin: 20px 0;">
          <strong style="font-size: 16px;">${contentTitle}</strong>
          <p style="margin: 10px 0 0 0; color: #065f46;">📱 Platform: ${platform}</p>
          <p style="margin: 5px 0 0 0; color: #065f46;">📅 Scheduled: ${formattedDate}</p>
        </div>
        ${customMessage ? `<p style="margin: 15px 0; padding: 10px; background-color: #d1fae5; border-radius: 4px; color: #065f46;">💬 ${customMessage}</p>` : ''}
        <p>Review your content one more time before posting. Your audience is waiting for your next great piece!</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${siteUrl}/dashboard/content" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Review Content</a>
        </div>
        <hr style="border: 0; border-top: 1px solid #eee; margin-top: 30px;" />
        <p style="font-size: 12px; color: #999; text-align: center;">This is a scheduling reminder from Solo Leveling Creator Hub. Manage your content calendar in your dashboard.</p>
      </div>
    `,
  }

  return sendEmailSafely(mailOptions)
}

export async function sendTimeBlockNotification(email: string, name: string, activityTitle: string, startTime: string, date: string, customMessage?: string) {
  const mailOptions = {
    from: `"Solo Leveling Time Planner" <${process.env.SMTP_FROM || 'noreply@sololeveling.com'}>`,
    to: email,
    subject: `⏱️ Time Block Alert: ${activityTitle}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px; background-color: #ffffff; color: #333333;">
        <h2 style="color: #8b5cf6; text-align: center;">⏱️ Time Block Reminder</h2>
        <p>Hello ${name},</p>
        <p>Your scheduled time block is starting soon:</p>
        <div style="background-color: #faf5ff; padding: 15px; border-left: 4px solid #8b5cf6; border-radius: 4px; margin: 20px 0;">
          <strong style="font-size: 16px;">${activityTitle}</strong>
          <p style="margin: 10px 0 0 0; color: #5b21b6;">🕐 Time: ${startTime}</p>
          <p style="margin: 5px 0 0 0; color: #5b21b6;">📅 Date: ${date}</p>
        </div>
        ${customMessage ? `<p style="margin: 15px 0; padding: 10px; background-color: #ede9fe; border-radius: 4px; color: #5b21b6;">💬 ${customMessage}</p>` : ''}
        <p>It's time to focus and make the most of your scheduled time block. Block all distractions and dive in!</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${siteUrl}/dashboard" style="background-color: #8b5cf6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Open Dashboard</a>
        </div>
        <hr style="border: 0; border-top: 1px solid #eee; margin-top: 30px;" />
        <p style="font-size: 12px; color: #999; text-align: center;">This is a time management reminder from Solo Leveling. Adjust your schedule in the time planner.</p>
      </div>
    `,
  }

  return sendEmailSafely(mailOptions)
}

export async function sendDailyHabitReminder(email: string, name: string, habitNames: string[], customMessage?: string) {
  const habitList = habitNames.map((h) => `<li style="margin: 8px 0;">${h}</li>`).join('')

  const mailOptions = {
    from: `"Solo Leveling Habits" <${process.env.SMTP_FROM || 'noreply@sololeveling.com'}>`,
    to: email,
    subject: '📋 Daily Habit Check-In',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px; background-color: #ffffff; color: #333333;">
        <h2 style="color: #06b6d4; text-align: center;">📋 Daily Habit Check-In</h2>
        <p>Hello ${name},</p>
        <p>Time to complete today's habits and keep your streak alive! 🔥</p>
        <div style="background-color: #ecfdf5; padding: 15px; border-left: 4px solid #06b6d4; border-radius: 4px; margin: 20px 0;">
          <p style="margin: 0 0 10px 0; font-weight: bold; color: #0e7490;">Today's Habits:</p>
          <ul style="margin: 0; padding-left: 20px; color: #164e63;">
            ${habitList}
          </ul>
        </div>
        ${customMessage ? `<p style="margin: 15px 0; padding: 10px; background-color: #cffafe; border-radius: 4px; color: #164e63;">💬 ${customMessage}</p>` : ''}
        <p>Every day you complete these habits gets you one step closer to mastery. Keep leveling up! 💪</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${siteUrl}/dashboard/habits" style="background-color: #06b6d4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Check In Habits</a>
        </div>
        <hr style="border: 0; border-top: 1px solid #eee; margin-top: 30px;" />
        <p style="font-size: 12px; color: #999; text-align: center;">This is a daily habit reminder from Solo Leveling. You can disable these reminders in your settings.</p>
      </div>
    `,
  }

  return sendEmailSafely(mailOptions)
}

export async function sendInvoiceDueReminder(email: string, name: string, invoiceAmount: number, dueDate: Date, clientName: string) {
  const formattedDate = new Date(dueDate).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  const mailOptions = {
    from: `"Solo Leveling Finance" <${process.env.SMTP_FROM || 'noreply@sololeveling.com'}>`,
    to: email,
    subject: `💰 Invoice Due Reminder: ₹${invoiceAmount}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px; background-color: #ffffff; color: #333333;">
        <h2 style="color: #dc2626; text-align: center;">💰 Invoice Due Reminder</h2>
        <p>Hello ${name},</p>
        <p>You have an upcoming invoice payment due:</p>
        <div style="background-color: #fef2f2; padding: 15px; border-left: 4px solid #dc2626; border-radius: 4px; margin: 20px 0;">
          <p style="margin: 0 0 10px 0; font-weight: bold; color: #7f1d1d;">Amount: ₹${invoiceAmount}</p>
          <p style="margin: 0 0 10px 0; color: #7f1d1d;">Client: ${clientName}</p>
          <p style="margin: 0; color: #7f1d1d;">📅 Due Date: ${formattedDate}</p>
        </div>
        <p>Make sure to follow up with your client to ensure timely payment. Track all your finances in your dashboard.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${siteUrl}/dashboard/finance" style="background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">View Invoices</a>
        </div>
        <hr style="border: 0; border-top: 1px solid #eee; margin-top: 30px;" />
        <p style="font-size: 12px; color: #999; text-align: center;">This is a financial reminder from Solo Leveling. Manage your invoices and payment tracking in your dashboard.</p>
      </div>
    `,
  }

  return sendEmailSafely(mailOptions)
}

// ==================== EXAM & ASSIGNMENT REMINDERS ====================

export async function sendExamReminder(email: string, name: string, examType: string, subject: string, examDate: Date, hoursUntil: number, customMessage?: string) {
  const formattedDate = new Date(examDate).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const mailOptions = {
    from: `"Solo Leveling College Hub" <${process.env.SMTP_FROM || 'noreply@sololeveling.com'}>`,
    to: email,
    subject: `📚 Exam Reminder: ${subject} ${examType}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px; background-color: #ffffff; color: #333333;">
        <h2 style="color: #7c3aed; text-align: center;">📚 Exam Reminder</h2>
        <p>Hello ${name},</p>
        <p>Your upcoming exam is approaching:</p>
        <div style="background-color: #faf5ff; padding: 15px; border-left: 4px solid #7c3aed; border-radius: 4px; margin: 20px 0;">
          <strong style="font-size: 16px;">${subject} - ${examType}</strong>
          <p style="margin: 10px 0 0 0; color: #581c87;">📅 Date & Time: ${formattedDate}</p>
          <p style="margin: 5px 0 0 0; color: #581c87;">⏱️ Time remaining: ${hoursUntil} hours</p>
        </div>
        ${customMessage ? `<p style="margin: 15px 0; padding: 10px; background-color: #ede9fe; border-radius: 4px; color: #581c87;">💬 ${customMessage}</p>` : ''}
        <p>Make sure you're prepared with all your study materials. Good luck with your exam! 🍀</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${siteUrl}/dashboard/college" style="background-color: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">View Exam Details</a>
        </div>
        <hr style="border: 0; border-top: 1px solid #eee; margin-top: 30px;" />
        <p style="font-size: 12px; color: #999; text-align: center;">This is an automated reminder from Solo Leveling. Manage your exam schedule in the college section.</p>
      </div>
    `,
  }

  return sendEmailSafely(mailOptions)
}

export async function sendAssignmentReminder(email: string, name: string, assignmentTitle: string, subject: string, dueDate: Date, hoursUntil: number, customMessage?: string) {
  const formattedDate = new Date(dueDate).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const mailOptions = {
    from: `"Solo Leveling College Hub" <${process.env.SMTP_FROM || 'noreply@sololeveling.com'}>`,
    to: email,
    subject: `📝 Assignment Reminder: ${assignmentTitle}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px; background-color: #ffffff; color: #333333;">
        <h2 style="color: #0891b2; text-align: center;">📝 Assignment Due Soon</h2>
        <p>Hello ${name},</p>
        <p>Your assignment submission deadline is approaching:</p>
        <div style="background-color: #ecfdf5; padding: 15px; border-left: 4px solid #0891b2; border-radius: 4px; margin: 20px 0;">
          <strong style="font-size: 16px;">${assignmentTitle}</strong>
          <p style="margin: 10px 0 0 0; color: #164e63;">📚 Subject: ${subject}</p>
          <p style="margin: 5px 0 0 0; color: #164e63;">📅 Due: ${formattedDate}</p>
          <p style="margin: 5px 0 0 0; color: #164e63;">⏱️ Time remaining: ${hoursUntil} hours</p>
        </div>
        ${customMessage ? `<p style="margin: 15px 0; padding: 10px; background-color: #cffafe; border-radius: 4px; color: #164e63;">💬 ${customMessage}</p>` : ''}
        <p>Don't miss this deadline! Complete and submit your assignment now to maintain your grades.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${siteUrl}/dashboard/college" style="background-color: #0891b2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">View Assignment</a>
        </div>
        <hr style="border: 0; border-top: 1px solid #eee; margin-top: 30px;" />
        <p style="font-size: 12px; color: #999; text-align: center;">This is an automated reminder from Solo Leveling. Manage your assignments in the college section.</p>
      </div>
    `,
  }

  return sendEmailSafely(mailOptions)
}

// ==================== EVENT/DEADLINE REMINDERS ====================

export async function sendCustomEventReminder(email: string, name: string, eventTitle: string, eventTime: Date, description?: string, customMessage?: string) {
  const formattedTime = new Date(eventTime).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const mailOptions = {
    from: `"Solo Leveling" <${process.env.SMTP_FROM || 'noreply@sololeveling.com'}>`,
    to: email,
    subject: `🔔 Reminder: ${eventTitle}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px; background-color: #ffffff; color: #333333;">
        <h2 style="color: #3b82f6; text-align: center;">🔔 Event Reminder</h2>
        <p>Hello ${name},</p>
        <p>You have an upcoming event reminder:</p>
        <div style="background-color: #eff6ff; padding: 15px; border-left: 4px solid #3b82f6; border-radius: 4px; margin: 20px 0;">
          <strong style="font-size: 16px;">${eventTitle}</strong>
          <p style="margin: 10px 0 0 0; color: #1e40af;">📅 Time: ${formattedTime}</p>
          ${description ? `<p style="margin: 5px 0 0 0; color: #1e40af;">📝 Details: ${description}</p>` : ''}
        </div>
        ${customMessage ? `<p style="margin: 15px 0; padding: 10px; background-color: #dbeafe; border-radius: 4px; color: #1e40af;">💬 ${customMessage}</p>` : ''}
        <p>Make sure you're ready for this event. Mark it on your calendar!</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${siteUrl}/dashboard" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">View Calendar</a>
        </div>
        <hr style="border: 0; border-top: 1px solid #eee; margin-top: 30px;" />
        <p style="font-size: 12px; color: #999; text-align: center;">This is an automated reminder from Solo Leveling. Manage your reminders in dashboard settings.</p>
      </div>
    `,
  }

  return sendEmailSafely(mailOptions)
}

export async function sendDeletionConfirmationEmail(
  email: string,
  name: string,
  itemType: 'assignment' | 'exam',
  itemTitle: string,
  itemId: string
) {
  const siteUrl = process.env.NEXTAUTH_URL || 'https://sololevelingguider.vercel.app/'
  const confirmUrl = `${siteUrl}/dashboard/college?confirmDelete=${itemType}&id=${itemId}`
  const cancelUrl = `${siteUrl}/dashboard/college?cancelDelete=${itemType}&id=${itemId}`

  const mailOptions = {
    from: `"Solo Leveling" <${process.env.SMTP_FROM || 'noreply@sololeveling.com'}>`,
    to: email,
    subject: `🗑️ Confirm Deletion: ${itemType === 'assignment' ? 'Assignment' : 'Exam'} - ${itemTitle}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px; background-color: #ffffff; color: #333333;">
        <h2 style="color: #dc2626; text-align: center;">🗑️ Confirm Deletion</h2>
        <p>Hello ${name},</p>
        <p>Your ${itemType === 'assignment' ? 'assignment' : 'exam'} deadline has passed. Would you like to delete it from your records?</p>
        <div style="background-color: #fef2f2; padding: 15px; border-left: 4px solid #dc2626; border-radius: 4px; margin: 20px 0;">
          <strong style="font-size: 16px;">${itemTitle}</strong>
          <p style="margin: 10px 0 0 0; color: #991b1b;">Type: ${itemType === 'assignment' ? 'Assignment' : 'Exam'}</p>
        </div>
        <p>This item is no longer active since its deadline has passed. You can choose to:</p>
        <ul style="margin: 20px 0; padding-left: 20px;">
          <li><strong>Delete</strong> - Remove it from your records permanently</li>
          <li><strong>Keep</strong> - Retain it for future reference</li>
        </ul>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${confirmUrl}" style="background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; margin-right: 10px;">Delete</a>
          <a href="${cancelUrl}" style="background-color: #6b7280; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Keep</a>
        </div>
        <hr style="border: 0; border-top: 1px solid #eee; margin-top: 30px;" />
        <p style="font-size: 12px; color: #999; text-align: center;">This is an automated message from Solo Leveling. If you didn't request this, please ignore this email.</p>
      </div>
    `,
  }

  return sendEmailSafely(mailOptions)
}

// Helper function to safely send emails
async function sendEmailSafely(mailOptions: any) {
  // Fallback console log for development
  if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    console.log('\n=======================================')
    console.log('--- EMAIL NOTIFICATION FALLBACK ---')
    console.log(`To: ${mailOptions.to}`)
    console.log(`Subject: ${mailOptions.subject}`)
    console.log('=======================================\n')
    return { success: true, logged: true }
  }

  try {
    await transporter.sendMail(mailOptions)
    return { success: true }
  } catch (error) {
    console.error(`Failed to send email to ${mailOptions.to}:`, error)
    return { success: false, error }
  }
}
