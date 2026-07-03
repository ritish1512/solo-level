import React from 'react'
import { auth } from '@/lib/auth'
import dbConnect from '@/lib/mongodb'
import Habit from '@/models/Habit'
import HabitsClient from './HabitsClient'

export const dynamic = 'force-dynamic'

export default async function HabitsPage() {
  const session = await auth()
  
  if (!session || !session.user) {
    return null
  }

  await dbConnect()

  const habits = await Habit.find({ user: session.user.id }).sort({ createdAt: -1 })
  const serializedHabits = JSON.parse(JSON.stringify(habits))

  return <HabitsClient initialHabits={serializedHabits} />
}
