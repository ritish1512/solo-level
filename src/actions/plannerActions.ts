'use server'

import mongoose from 'mongoose'
import { auth } from '@/lib/auth'
import dbConnect from '@/lib/mongodb'
import TimeBlock from '@/models/TimeBlock'

export interface PlannerResponse {
  success: boolean
  message?: string
  error?: string
  timeBlock?: any
  timeBlocks?: any[]
}

// Helper to check user session
async function checkAuth() {
  const session = await auth()
  if (!session || !session.user) {
    throw new Error('Unauthorized. Please log in.')
  }
  return session
}

export async function getTimeBlocksAction(dateStr: string): Promise<PlannerResponse> {
  try {
    const session = await checkAuth()
    await dbConnect()

    const timeBlocks = await TimeBlock.find({
      user: session.user.id,
      date: dateStr,
    }).sort({ position: 1, startTime: 1 })

    return {
      success: true,
      timeBlocks: JSON.parse(JSON.stringify(timeBlocks)),
    }
  } catch (error: any) {
    console.error('Get TimeBlocks Action Error:', error)
    return { success: false, error: error.message || 'Failed to fetch planner blocks.' }
  }
}

export async function createTimeBlockAction(data: any): Promise<PlannerResponse> {
  try {
    const session = await checkAuth()
    await dbConnect()

    const { title, startTime, endTime, date } = data

    if (!title || !startTime || !endTime || !date) {
      return { success: false, error: 'Title, start time, end time, and date are required.' }
    }

    // Get count to determine next position index
    const count = await TimeBlock.countDocuments({ user: session.user.id, date })

    const newBlock = await TimeBlock.create({
      user: new mongoose.Types.ObjectId(session.user.id),
      title,
      startTime,
      endTime,
      date,
      isCompleted: false,
      position: count,
    })

    return {
      success: true,
      message: 'Schedule slot added!',
      timeBlock: JSON.parse(JSON.stringify(newBlock)),
    }
  } catch (error: any) {
    console.error('Create TimeBlock Action Error:', error)
    return { success: false, error: error.message || 'Failed to create planner block.' }
  }
}

export async function updateTimeBlockAction(id: string, data: any): Promise<PlannerResponse> {
  try {
    const session = await checkAuth()
    await dbConnect()

    const block = await TimeBlock.findOne({ _id: id, user: session.user.id })
    if (!block) {
      return { success: false, error: 'Schedule slot not found.' }
    }

    const { title, startTime, endTime, isCompleted } = data

    block.title = title || block.title
    block.startTime = startTime || block.startTime
    block.endTime = endTime || block.endTime
    if (isCompleted !== undefined) {
      block.isCompleted = isCompleted
    }

    await block.save()

    return {
      success: true,
      message: 'Schedule slot updated!',
      timeBlock: JSON.parse(JSON.stringify(block)),
    }
  } catch (error: any) {
    console.error('Update TimeBlock Action Error:', error)
    return { success: false, error: error.message || 'Failed to update planner block.' }
  }
}

export async function deleteTimeBlockAction(id: string): Promise<PlannerResponse> {
  try {
    const session = await checkAuth()
    await dbConnect()

    const block = await TimeBlock.findOne({ _id: id, user: session.user.id })
    if (!block) {
      return { success: false, error: 'Schedule slot not found.' }
    }

    const { date, position: deletedPosition } = block

    await block.deleteOne()

    // Re-index remaining positions for this day to keep positions sequential
    await TimeBlock.updateMany(
      { user: session.user.id, date, position: { $gt: deletedPosition } },
      { $inc: { position: -1 } }
    )

    return {
      success: true,
      message: 'Schedule slot removed.',
    }
  } catch (error: any) {
    console.error('Delete TimeBlock Action Error:', error)
    return { success: false, error: error.message || 'Failed to delete planner block.' }
  }
}

export async function reorderTimeBlocksAction(orderedIds: string[]): Promise<PlannerResponse> {
  try {
    const session = await checkAuth()
    await dbConnect()

    // Bulk update positions using MongoDB write operations
    const bulkOps = orderedIds.map((id, index) => ({
      updateOne: {
        filter: { _id: id, user: session.user.id },
        update: { $set: { position: index } },
      },
    }))

    if (bulkOps.length > 0) {
      await TimeBlock.bulkWrite(bulkOps)
    }

    return {
      success: true,
      message: 'Schedule reordered successfully.',
    }
  } catch (error: any) {
    console.error('Reorder TimeBlocks Action Error:', error)
    return { success: false, error: error.message || 'Failed to reorder planner.' }
  }
}
