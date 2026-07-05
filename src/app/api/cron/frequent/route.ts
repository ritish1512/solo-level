import { NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import { processPendingReminders } from '@/services/reminderService'

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
    // Authorization validation - check bearer token
    const authHeader = request.headers.get('authorization')
    const serverSecret = process.env.CRON_SECRET

    if (!authHeader || authHeader !== `Bearer ${serverSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Open secure database connection pool
    await dbConnect()

    // Process pending reminders using the reminder service
    const reminderResult = await processPendingReminders()
    result.remindersProcessed = reminderResult.processed
    result.remindersSent = reminderResult.sent
    result.remindersFailed = reminderResult.failed

    return NextResponse.json({
      success: true,
      message: 'High-frequency time-sensitive notifications processed successfully.',
      result,
    })

  } catch (error: any) {
    console.error('Frequent Cron Error:', error)
    result.errors.push(error.message || 'Internal Server Error')
    return NextResponse.json(
      { error: error.message || 'Internal Server Error', result },
      { status: 500 }
    )
  }
}
