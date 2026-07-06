import { NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import { processPendingReminders } from '@/services/reminderService'
import runInBackground from '@/lib/cronHelper'

export const dynamic = 'force-dynamic'

interface ProcessingResult {
  remindersProcessed: number
  remindersSent: number
  remindersFailed: number
  errors: string[]
}

export async function GET(request: Request) {
  const result: ProcessingResult = {
    remindersProcessed: 0,
    remindersSent: 0,
    remindersFailed: 0,
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
      try {
        const reminderResult = await processPendingReminders()
        result.remindersProcessed = reminderResult.processed
        result.remindersSent = reminderResult.sent
        result.remindersFailed = reminderResult.failed
        console.log('Frequent cron background task finished', result)
      } catch (err: any) {
        console.error('Frequent cron background task error:', err)
      }
    }

    runInBackground(bgTask).catch(() => null)
    return NextResponse.json({ success: true, scheduled: true, message: 'Frequent task scheduled.' })

  } catch (error: any) {
    console.error('Frequent Cron Error:', error)
    result.errors.push(error.message || 'Internal Server Error')
    return NextResponse.json(
      { error: error.message || 'Internal Server Error', result },
      { status: 500 }
    )
  }
}
