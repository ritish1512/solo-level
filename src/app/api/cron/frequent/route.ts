import { NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Task from '@/models/Task'
import TimeBlock from '@/models/TimeBlock'
import { sendTaskDeadlineReminder, sendTimeBlockNotification } from '@/services/emailService'

export const dynamic = 'force-dynamic'

interface ProcessingResult {
  taskReminders: number
  timeBlockReminders: number
  errors: string[]
}

export async function GET(request: Request) {
  const result: ProcessingResult = {
    taskReminders: 0,
    timeBlockReminders: 0,
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

    // ==================== 1. TASK DEADLINE REMINDERS ====================
    try {
      const tasks = await Task.find({
        reminderOffset: { $gt: 0 },
        reminderSent: false,
        status: { $ne: 'Completed' },
      }).populate('user')

      const taskPromises = tasks.map(async (task) => {
        const user = task.user as any
        if (!user) return

        const deadlineTime = new Date(task.deadline).getTime()
        const reminderTime = deadlineTime - (task.reminderOffset ?? 0) * 60 * 1000

        if (currentTime >= reminderTime && currentTime < deadlineTime) {
          const hoursUntil = Math.ceil((deadlineTime - currentTime) / (1000 * 60 * 60))
          await sendTaskDeadlineReminder(user.email, user.name, task.title, task.deadline, hoursUntil)
          task.reminderSent = true
          await task.save()
          result.taskReminders++
        }
      })
      await Promise.all(taskPromises)
    } catch (err: any) {
      result.errors.push(`Task reminders error: ${err.message}`)
    }

    // ==================== 2. TIMEBLOCK REMINDERS ====================
    try {
      const today = now.toISOString().split('T')[0]
      const currentHour = now.getHours().toString().padStart(2, '0')
      const currentMinute = now.getMinutes().toString().padStart(2, '0')

      const timeBlocks = await TimeBlock.find({
        date: today,
        isCompleted: false,
      }).populate('user')

      const timeBlockPromises = timeBlocks.map(async (timeBlock) => {
        const user = timeBlock.user as any
        if (!user) return

        const [blockHour, blockMinute] = timeBlock.startTime.split(':')
        const blockTotalMinutes = parseInt(blockHour) * 60 + parseInt(blockMinute)
        const currentTotalMinutes = parseInt(currentHour) * 60 + parseInt(currentMinute)
        const minutesUntilStart = blockTotalMinutes - currentTotalMinutes

        if (minutesUntilStart > 14 && minutesUntilStart <= 15) {
          await sendTimeBlockNotification(user.email, user.name, timeBlock.title, timeBlock.startTime, timeBlock.date)
          result.timeBlockReminders++
        }
      })
      await Promise.all(timeBlockPromises)
    } catch (err: any) {
      result.errors.push(`TimeBlock reminders error: ${err.message}`)
    }

    return NextResponse.json({
      success: true,
      message: 'High-frequency time-sensitive notifications processed successfully.',
      result,
    })

  } catch (error: any) {
    console.error('Frequent Cron Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal Server Error', result },
      { status: 500 }
    )
  }
}
