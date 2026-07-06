import { NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import ContentIdea from '@/models/ContentIdea'
import { sendScheduledContentReminder } from '@/services/emailService'
import runInBackground from '@/lib/cronHelper'

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
    // Authorization validation - accept Bearer or X-Cron-Secret header
    const authHeader = request.headers.get('authorization')
    const headerSecret = request.headers.get('x-cron-secret')
    const serverSecret = process.env.CRON_SECRET

    const isAuthorized = (authHeader && authHeader === `Bearer ${serverSecret}`) || (headerSecret && headerSecret === serverSecret)
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const bgTask = async () => {
      await dbConnect()
      const now = new Date()
      const currentTime = now.getTime()

      try {
        const endOfTomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
        const scheduledContent = await ContentIdea.find({
          scheduledDate: { $gte: now, $lte: endOfTomorrow },
        }).select('_id user title platform scheduledDate lastReminderSentAt').populate('user', '_id email name').lean()

        await Promise.all(
          scheduledContent.map(async (content: any) => {
            try {
              const user = content.user as any
              if (!user) return

              const lastEmailDate = content.lastReminderSentAt ? new Date(content.lastReminderSentAt) : null
              if (lastEmailDate && currentTime - lastEmailDate.getTime() < 24 * 60 * 60 * 1000) {
                return
              }

              await sendScheduledContentReminder(user.email, user.name, content.title, content.platform, content.scheduledDate ?? now)

              await ContentIdea.updateOne({ _id: content._id }, { $set: { lastReminderSentAt: now } })
              result.contentReminders++
            } catch (singleContentErr: any) {
              result.errors.push(`Content dynamic error (ID ${content._id}): ${singleContentErr.message}`)
            }
          })
        )
      } catch (err: any) {
        result.errors.push(`Content reminders error: ${err.message}`)
      }
    }

    runInBackground(bgTask).catch(() => null)
    return NextResponse.json({ success: true, scheduled: true, message: 'Evening task scheduled.' })

  } catch (error: any) {
    console.error('Evening Cron Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal Server Error', result },
      { status: 500 }
    )
  }
}
