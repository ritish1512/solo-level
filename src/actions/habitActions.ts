"use server";
import mongoose from 'mongoose'
import { auth } from '@/lib/auth'
import dbConnect from '@/lib/mongodb'
import Habit, { IHabit } from '@/models/Habit'
import User from '@/models/User'

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
export async function calculateStreak(completedDates: string[]): Promise<{ currentStreak: number; longestStreak: number }> {
  if (completedDates.length === 0) {
    return { currentStreak: 0, longestStreak: 0 }
  }

  // Parse, filter unique values, and sort dates chronologically descending (newest first)
  const uniqueDates = Array.from(new Set(completedDates)).sort((a, b) => b.localeCompare(a))
  
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().split('T')[0]

  // If neither today nor yesterday is in the completed dates list, current streak is broken (0)
  const hasCompletedRecent = uniqueDates.includes(todayStr) || uniqueDates.includes(yesterdayStr)
  
  let currentStreak = 0
  let longestStreak = 0
  let tempStreak = 0
  let expectedDate = null

  // 1. Calculate Longest Streak (scanning chronologically ascending: oldest first)
  const ascendingDates = [...uniqueDates].reverse()
  for (let i = 0; i < ascendingDates.length; i++) {
    const current = new Date(ascendingDates[i])
    
    if (expectedDate === null) {
      tempStreak = 1
    } else {
      const diffTime = current.getTime() - expectedDate.getTime()
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24))

      if (diffDays === 1) {
        tempStreak++
      } else if (diffDays > 1) {
        tempStreak = 1
      }
    }
    
    if (tempStreak > longestStreak) {
      longestStreak = tempStreak
    }
    
    expectedDate = current
  }

  // 2. Calculate Current Streak (scanning descending: newest first)
  if (hasCompletedRecent) {
    // Start count from the most recent completed date
    let lastDate = new Date(uniqueDates[0])
    currentStreak = 1

    for (let i = 1; i < uniqueDates.length; i++) {
      const current = new Date(uniqueDates[i])
      const diffTime = lastDate.getTime() - current.getTime()
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24))

      if (diffDays === 1) {
        currentStreak++
        lastDate = current
      } else if (diffDays > 1) {
        break // Gap found, stop counting
      }
    }
  }

  return {
    currentStreak,
    longestStreak: Math.max(longestStreak, currentStreak),
  }
}

export async function createHabitAction(name: string): Promise<HabitResponse> {
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

    const newHabit = await Habit.create({
      user: new mongoose.Types.ObjectId(session.user.id),
      name: name.trim(),
      completedDates: [],
      streak: 0,
      longestStreak: 0,
    })

    return {
      success: true,
      message: 'Habit tracking initialized!',
      habit: JSON.parse(JSON.stringify(newHabit)),
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

    return {
      success: true,
      habits: JSON.parse(JSON.stringify(habits)),
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

    const index = habit.completedDates.indexOf(dateStr)
    const isAdding = index === -1

    if (isAdding) {
      habit.completedDates.push(dateStr)
    } else {
      habit.completedDates.splice(index, 1)
    }

    // Recalculate streak values
    const { currentStreak, longestStreak } = await calculateStreak(habit.completedDates)
    habit.streak = currentStreak
    habit.longestStreak = longestStreak

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
