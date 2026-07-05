import { NextResponse } from 'next/server'
import { processPendingReminders } from '@/services/reminderService'

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

    // Process pending reminders using the service function
    const result = await processPendingReminders()

    return NextResponse.json({
      success: true,
      message: `Processed ${result.processed} reminder(s). Sent ${result.sent} email(s).`,
      processed: result.processed,
      sent: result.sent,
      failed: result.failed,
    })
  } catch (error: any) {
    console.error('Cron Reminders API Error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
