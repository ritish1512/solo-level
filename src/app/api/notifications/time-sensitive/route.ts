import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import dbConnect from '@/lib/mongodb'
import Task from '@/models/Task'
import TimeBlock from '@/models/TimeBlock'
import { sendTaskDeadlineReminder, sendTimeBlockNotification } from '@/services/emailService'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await dbConnect()

    const notifications: any[] = []
    const now = new Date()

    // ==================== TASK DEADLINE REMINDERS ====================
    try {
      const tasks = await Task.find({
        user: session.user.id,
        reminderOffset: { $gt: 0 },
        reminderSent: false,
        status: { $ne: 'Completed' },
      })

      for (const task of tasks) {
        const deadlineTime = new Date(task.deadline).getTime()
        const reminderTime = deadlineTime - (task.reminderOffset ?? 0) * 60 * 1000
        const currentTime = now.getTime()

        // Check if it's time to send the reminder (within 1 minute window)
        if (currentTime >= reminderTime && currentTime < deadlineTime && currentTime - reminderTime < 60 * 1000) {
          const hoursUntil = Math.ceil((deadlineTime - currentTime) / (1000 * 60 * 60))
          
          // Send email
          await sendTaskDeadlineReminder(session.user.email || '', session.user.name || '', task.title, task.deadline, hoursUntil)
          
          // Mark as sent
          task.reminderSent = true
          await task.save()

          // Add to notifications
          notifications.push({
            id: task._id.toString(),
            type: 'task',
            title: task.title,
            time: new Date(task.deadline).toLocaleString(),
            message: `Task deadline in ${hoursUntil} hours`,
          })
        }
      }
    } catch (err: any) {
      console.error('Task reminders error:', err)
    }

    // ==================== TIMEBLOCK REMINDERS ====================
    try {
      const today = now.toISOString().split('T')[0]
      const currentHour = now.getHours().toString().padStart(2, '0')
      const currentMinute = now.getMinutes().toString().padStart(2, '0')
      const currentTime = `${currentHour}:${currentMinute}`

      const timeBlocks = await TimeBlock.find({
        user: session.user.id,
        date: today,
        isCompleted: false,
      })

      for (const timeBlock of timeBlocks) {
        const [blockHour, blockMinute] = timeBlock.startTime.split(':')
        const blockTotalMinutes = parseInt(blockHour) * 60 + parseInt(blockMinute)
        const currentTotalMinutes = parseInt(currentHour) * 60 + parseInt(currentMinute)
        const minutesUntilStart = blockTotalMinutes - currentTotalMinutes

        // Send reminder 15 minutes before start time (within 1 minute window)
        if (minutesUntilStart > 14 && minutesUntilStart <= 15) {
          await sendTimeBlockNotification(session.user.email || '', session.user.name || '', timeBlock.title, timeBlock.startTime, timeBlock.date)

          // Add to notifications
          notifications.push({
            id: timeBlock._id.toString(),
            type: 'timeblock',
            title: timeBlock.title,
            time: timeBlock.startTime,
            message: `Time block starting in 15 minutes`,
          })
        }
      }
    } catch (err: any) {
      console.error('TimeBlock reminders error:', err)
    }

    return NextResponse.json({
      success: true,
      notifications,
      checkedAt: now.toISOString(),
    })
  } catch (error: any) {
    console.error('Time-sensitive notifications error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    )
  }
}
