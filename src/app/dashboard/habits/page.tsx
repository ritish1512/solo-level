import React from 'react'
import { auth } from '@/lib/auth'
import dbConnect from '@/lib/mongodb'
import Habit from '@/models/Habit'
import { normalizeHabitRecurrence } from '@/lib/habitRecurrence'
import HabitsClient from './HabitsClient'

export const dynamic = 'force-dynamic'

export default async function HabitsPage() {
  const session = await auth()
  
  if (!session || !session.user) {
    return null
  }

  await dbConnect()

  const habits = await Habit.find({ user: session.user.id }).sort({ createdAt: -1 })
  const serializedHabitsRaw = JSON.parse(JSON.stringify(habits))
  const serializedHabits = serializedHabitsRaw.map((h: any) => {
    const recurrence = normalizeHabitRecurrence({ type: h.recurrenceType ?? h.recurrence?.type, days: h.recurrenceDays ?? h.recurrence?.days })
    return { ...h, recurrence, recurrenceType: recurrence.type, recurrenceDays: recurrence.days }
  })

  return <HabitsClient initialHabits={serializedHabits} />
}
