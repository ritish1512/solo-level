"use server";
import mongoose from 'mongoose'
import { auth } from '@/lib/auth'
import dbConnect from '@/lib/mongodb'
import Habit, { IHabit } from '@/models/Habit'
import User from '@/models/User'
import { getHabitDueDatesBetween, HabitRecurrence, isHabitDueForDate, normalizeHabitRecurrence } from '@/lib/habitRecurrence'

export interface HabitResponse {
  success: boolean
  message?: string
  error?: string
  habit?: any
  habits?: any[]
  xpAwarded?: number
}

// Helper to check user session
async function checkAuth() {
  const session = await auth()
  if (!session || !session.user) {
    throw new Error('Unauthorized. Please log in.')
  }
  return session
}

// Helper to calculate streaks from YYYY-MM-DD string arrays
export async function calculateStreak(
  completedDates: string[],
  recurrence?: HabitRecurrence | null
): Promise<{ currentStreak: number; longestStreak: number }> {
  const uniqueDates = Array.from(new Set(completedDates.filter(Boolean))).sort((a, b) => a.localeCompare(b))
  if (uniqueDates.length === 0) {
    return { currentStreak: 0, longestStreak: 0 }
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const firstDate = new Date(uniqueDates[0])
  firstDate.setHours(0, 0, 0, 0)

  const dueDates = getHabitDueDatesBetween(recurrence, firstDate, today)
  const completedSet = new Set(uniqueDates)

  let longestStreak = 0
  let currentStreak = 0
  let run = 0

  for (const dateStr of dueDates) {
    if (completedSet.has(dateStr)) {
      run++
    } else {
      longestStreak = Math.max(longestStreak, run)
      run = 0
    }
  }

  longestStreak = Math.max(longestStreak, run)

  for (let i = dueDates.length - 1; i >= 0; i--) {
    const dateStr = dueDates[i]
    if (completedSet.has(dateStr)) {
      currentStreak++
    } else {
      break
    }
  }

  return {
    currentStreak,
    longestStreak,
  }
}

export async function createHabitAction(
  name: string,
  recurrence?: { type?: string; days?: string[] } | null
): Promise<HabitResponse> {
  try {
    const session = await checkAuth()
    
    if (!name || name.trim() === '') {
      return { success: false, error: 'Habit name is required.' }
    }

    await dbConnect()

    const existingHabit = await Habit.findOne({
      user: session.user.id,
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
    })

    if (existingHabit) {
      return { success: false, error: 'A habit with this name already exists.' }
    }

    const normalizedRecurrence = normalizeHabitRecurrence(
      recurrence && typeof recurrence === 'object'
        ? { type: recurrence.type as any, days: recurrence.days || [] }
        : { type: 'daily', days: [] }
    )

    const newHabit = await Habit.create({
      user: new mongoose.Types.ObjectId(session.user.id),
      name: name.trim(),
      recurrence: normalizedRecurrence,
      recurrenceType: normalizedRecurrence.type,
      recurrenceDays: normalizedRecurrence.days,
      completedDates: [],
      streak: 0,
      longestStreak: 0,
    })
    const habitObj: any = JSON.parse(JSON.stringify(newHabit))
    // Ensure response includes normalized recurrence flat fields for clients
    habitObj.recurrence = normalizedRecurrence
    habitObj.recurrenceType = normalizedRecurrence.type
    habitObj.recurrenceDays = normalizedRecurrence.days

    return {
      success: true,
      message: 'Habit tracking initialized!',
      habit: habitObj,
    }
  } catch (error: any) {
    console.error('Create Habit Action Error:', error)
    return { success: false, error: error.message || 'Failed to create habit.' }
  }
}

export async function getHabitsAction(): Promise<HabitResponse> {
  try {
    const session = await checkAuth()
    await dbConnect()

    const habits = await Habit.find({ user: session.user.id }).sort({ createdAt: -1 })

    // Ensure recurrence fields are normalized for older documents that may lack the flat fields
    const normalized = habits.map((h) => {
      const recurrence = normalizeHabitRecurrence({
        type: (h as any).recurrenceType ?? (h as any).recurrence?.type,
        days: (h as any).recurrenceDays ?? (h as any).recurrence?.days,
      })

      const obj = JSON.parse(JSON.stringify(h))
      obj.recurrence = recurrence
      obj.recurrenceType = recurrence.type
      obj.recurrenceDays = recurrence.days
      return obj
    })

    return {
      success: true,
      habits: normalized,
    }
  } catch (error: any) {
    console.error('Get Habits Action Error:', error)
    return { success: false, error: error.message || 'Failed to fetch habits.' }
  }
}

export async function toggleHabitDateAction(habitId: string, dateStr: string): Promise<HabitResponse> {
  try {
    const session = await checkAuth()
    await dbConnect()

    const habit = await Habit.findOne({ _id: habitId, user: session.user.id })
    if (!habit) {
      return { success: false, error: 'Habit not found.' }
    }

    const targetDate = new Date(`${dateStr}T00:00:00`)
    const recurrenceObj = normalizeHabitRecurrence({
      type: habit.recurrenceType ?? habit.recurrence?.type,
      days: habit.recurrenceDays ?? habit.recurrence?.days,
    })

    if (!isHabitDueForDate(recurrenceObj, targetDate)) {
      return { success: false, error: 'This habit is not scheduled for that date.' }
    }

    const index = habit.completedDates.indexOf(dateStr)
    const isAdding = index === -1

    if (isAdding) {
      habit.completedDates.push(dateStr)
    } else {
      habit.completedDates.splice(index, 1)
    }

    // Recalculate streak values using the habit recurrence schedule
    const { currentStreak, longestStreak } = await calculateStreak(habit.completedDates, recurrenceObj)
    habit.streak = currentStreak
    habit.longestStreak = Math.max(habit.longestStreak ?? 0, longestStreak)

    await habit.save()

    let xpAwarded = 0
    let rewardMessage = ''

    if (isAdding) {
      xpAwarded += 5 // +5 XP for checking a habit
      
      // Check if all habits for this date are completed for "Perfect Day" bonus (+20 XP)
      const allHabits = await Habit.find({ user: session.user.id })
      const allCompleted = allHabits.every((h) => 
        h._id.toString() === habitId 
          ? true // currently checked
          : h.completedDates.includes(dateStr)
      )

      if (allCompleted && allHabits.length > 1) {
        xpAwarded += 20
        rewardMessage = ' PERFECT DAY BONUS! All habits completed for today! +25 XP total.'
      } else {
        rewardMessage = ' +5 XP awarded.'
      }

      // Add XP to user model
      const user = await User.findById(session.user.id)
      if (user) {
        user.xp += xpAwarded
        const newLevel = Math.floor(user.xp / 100) + 1
        if (newLevel > user.level) {
          user.level = newLevel
          rewardMessage += ` LEVEL UP! You reached Level ${newLevel}!`
        }
        await user.save()
      }
    }

    return {
      success: true,
      message: isAdding ? `Habit completed!${rewardMessage}` : 'Habit completion unchecked.',
      habit: JSON.parse(JSON.stringify(habit)),
      xpAwarded,
    }
  } catch (error: any) {
    console.error('Toggle Habit Date Action Error:', error)
    return { success: false, error: error.message || 'Failed to toggle habit date.' }
  }
}

export async function deleteHabitAction(id: string): Promise<HabitResponse> {
  try {
    const session = await checkAuth()
    await dbConnect()

    const habit = await Habit.findOne({ _id: id, user: session.user.id })
    if (!habit) {
      return { success: false, error: 'Habit not found.' }
    }

    await habit.deleteOne()

    return {
      success: true,
      message: 'Habit tracker deleted successfully.',
    }
  } catch (error: any) {
    console.error('Delete Habit Action Error:', error)
    return { success: false, error: error.message || 'Failed to delete habit.' }
  }
}
