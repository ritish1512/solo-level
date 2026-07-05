import { NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import ContentIdea from '@/models/ContentIdea'
import { sendScheduledContentReminder } from '@/services/emailService'

export const dynamic = 'force-dynamic'

interface ProcessingResult {
  contentReminders: number
  errors: string[]
}

export async function GET(request: Request) {
  const result: ProcessingResult = {
    contentReminders: 0,
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

    // ==================== SCHEDULED CONTENT REMINDERS ====================
    try {
      // Look for content scheduled for the next 24 hours (evening check for next day's content)
      const endOfTomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
      const scheduledContent = await ContentIdea.find({
        scheduledDate: { $gte: now, $lte: endOfTomorrow },
      }).populate('user')

      // Process scheduled content concurrently using Promise.all
      await Promise.all(
        scheduledContent.map(async (content) => {
          try {
            const user = content.user as any
            if (!user) return

            // Send once per day only validation constraint check
            const lastEmailDate = content.lastReminderSentAt ? new Date(content.lastReminderSentAt) : null
            if (lastEmailDate && currentTime - lastEmailDate.getTime() < 24 * 60 * 60 * 1000) {
              return
            }

            await sendScheduledContentReminder(user.email, user.name, content.title, content.platform, content.scheduledDate ?? now)
            
            content.lastReminderSentAt = now
            await content.save()
            result.contentReminders++
          } catch (singleContentErr: any) {
            result.errors.push(`Content dynamic error (ID ${content._id}): ${singleContentErr.message}`)
          }
        })
      )
    } catch (err: any) {
      result.errors.push(`Content reminders error: ${err.message}`)
    }

    return NextResponse.json({
      success: true,
      message: 'Evening daily notifications processed successfully.',
      result,
    })

  } catch (error: any) {
    console.error('Evening Cron Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal Server Error', result },
      { status: 500 }
    )
  }
}
