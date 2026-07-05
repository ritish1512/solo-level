# Comprehensive Reminders Implementation Guide

## Table of Contents
1. [System Architecture Overview](#system-architecture-overview)
2. [Understanding Current Implementation](#understanding-current-implementation)
3. [Step-by-Step Implementation Guide](#step-by-step-implementation-guide)
4. [Feature-Specific Implementation](#feature-specific-implementation)

---

## System Architecture Overview

### How Reminders Work in Your App

```
┌─────────────────────────────────────────────────────────────┐
│                    REMINDER SYSTEM FLOW                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. User creates entity (Task, Assignment, Exam, etc)      │
│       ↓                                                     │
│  2. User sets reminder config (timing + channel)           │
│       ↓                                                     │
│  3. Backend creates Reminder document in DB                │
│       ↓                                                     │
│  4. Cron job runs periodically (processPendingReminders)   │
│       ↓                                                     │
│  5. When triggerTime reached:                              │
│       ├─ Send Email (if channel = 'email' or 'both')      │
│       ├─ Create In-App Notification (always)               │
│       └─ Mark reminder as sent                             │
└─────────────────────────────────────────────────────────────┘
```

### Database Models Involved

```
User
├── Tasks (reminderConfigs: IReminderConfig[])
├── Assignments (reminderConfigs: IReminderConfig[])
├── Exams (reminderConfigs: IReminderConfig[])
├── Habits (needs reminderConfigs added)
├── TimeBlocks (needs reminderConfigs added)
└── Reminders (stores actual reminder instances)
```

### Key Files & Their Roles

| File | Purpose |
|------|---------|
| `src/models/Reminder.ts` | Stores reminder instances with trigger time |
| `src/models/Task.ts` | Already supports reminderConfigs |
| `src/models/College.ts` | Exam & Assignment models (needs update) |
| `src/models/Habit.ts` | Habit model (needs reminderConfigs) |
| `src/services/reminderService.ts` | Core reminder functions (create, update, process) |
| `src/services/emailService.ts` | Sends emails (modify for different reminder types) |
| `src/lib/reminderUtils.ts` | Helper functions & presets |
| `src/actions/taskActions.ts` | Server actions for tasks (reference) |
| `src/actions/collegeActions.ts` | Need to create/update for exams & assignments |
| `src/actions/habitActions.ts` | Need to update for habit reminders |
| `src/app/api/cron/reminders.ts` | Cron endpoint to process pending reminders |

---

## Understanding Current Implementation

### 1. IReminderConfig Interface (Used by Task Model)

```typescript
// Located in: src/models/Task.ts
interface IReminderConfig {
  enabled: boolean
  timeBefore: number          // minutes before deadline
  notificationType: 'email' | 'in-app' | 'both'
  emailSent?: boolean
}

// Example usage in Task:
const taskData = {
  title: "Complete Project",
  deadline: "2026-07-15",
  reminderConfigs: [
    { enabled: true, timeBefore: 60, notificationType: 'both' },     // 1 hour before
    { enabled: true, timeBefore: 1440, notificationType: 'email' }   // 1 day before
  ]
}
```

### 2. Reminder Model (Database Storage)

```typescript
// Located in: src/models/Reminder.ts
interface IReminder {
  user: ObjectId              // User who should receive reminder
  title: string              // Reminder message
  relatedTo: 'task' | 'exam' | 'assignment' | 'event' | 'custom'
  relatedId: ObjectId        // ID of related entity
  triggerTime: Date          // When to send reminder
  isSent: boolean            // Already processed?
  emailSent: boolean         // Email sent successfully?
  channel: 'both' | 'email' | 'in-app'
}
```

### 3. Reminder Service Functions (Core Logic)

```typescript
// Located in: src/services/reminderService.ts

// CREATE: Generate reminders from config
async function createTaskReminders(
  taskId: string,
  reminderConfigs: IReminderConfig[]
): Promise<{ success: boolean; message?: string; error?: string }>

// UPDATE: Modify existing reminders
async function updateTaskReminders(
  taskId: string,
  reminderConfigs: IReminderConfig[]
): Promise<{ success: boolean; message?: string; error?: string }>

// PROCESS: Run by cron to send pending reminders
async function processPendingReminders(): Promise<{
  processed: number
  sent: number
  failed: number
}>
```

### 4. How Task Reminders Work (Already Implemented)

```typescript
// In taskActions.ts - When creating a task with reminders:

const newTask = await Task.create({
  title: "Complete assignment",
  deadline: new Date("2026-07-15"),
  reminderConfigs: [
    { enabled: true, timeBefore: 1440, notificationType: 'both' }  // 1 day before
  ]
})

// Service automatically creates Reminder documents:
// Reminder #1: triggerTime = July 14 @ current_time, channel = 'both'
```

---

## Step-by-Step Implementation Guide

### STEP 1: Set Up Database Migrations

#### 1.1 Update Habit Model (Add Reminder Support)

**File:** `src/models/Habit.ts`

**What to do:** Add `reminderConfigs` field to Habit schema

```typescript
// FIND THIS SECTION:
const HabitSchema: Schema<IHabit> = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Habit name is required'],
      trim: true,
    },
    // ... existing fields

    longestStreak: {
      type: Number,
      default: 0,
    },
    // *** ADD THIS BLOCK BEFORE timestamps: ***
    reminderConfigs: {
      type: [
        {
          enabled: { type: Boolean, default: true },
          timeBefore: { type: Number, required: true },
          notificationType: { type: String, enum: ['email', 'in-app', 'both'], default: 'both' },
          emailSent: { type: Boolean, default: false },
        },
      ],
      default: [],
    },
  },
  {
    timestamps: true,
  }
)
```

**Also add to IHabit interface at top of file:**

```typescript
export interface IHabit extends Document {
  // ... existing fields
  reminderConfigs: IReminderConfig[]  // ADD THIS LINE
  createdAt: Date
  updatedAt: Date
}

// ADD THIS IMPORT AT TOP:
import { IReminderConfig } from './Task'
```

#### 1.2 Update College Model (Assignment & Exam Already Has Reminders)

**File:** `src/models/College.ts`

**Action:** Your College model already has `reminderConfigs` for Assignments and Exams. No changes needed here! ✅

#### 1.3 Create TimeBlock Model Extension (If Not Exists)

**File:** `src/models/TimeBlock.ts`

**What to do:** Add `reminderConfigs` if not present

```typescript
// Follow same pattern as Habit above
reminderConfigs: {
  type: [
    {
      enabled: { type: Boolean, default: true },
      timeBefore: { type: Number, required: true },
      notificationType: { type: String, enum: ['email', 'in-app', 'both'], default: 'both' },
      emailSent: { type: Boolean, default: false },
    },
  ],
  default: [],
}
```

---

### STEP 2: Create/Update Service Functions

#### 2.1 Extend reminderService.ts with Generic Functions

**File:** `src/services/reminderService.ts`

**What to do:** Add these new functions at the end of the file (before the closing brace)

```typescript
/**
 * Generic function to create reminders for ANY entity type
 * Use this for Habits, Exams, Assignments, Events, etc.
 */
export async function createGenericReminders(
  entityId: string,
  entityType: 'habit' | 'exam' | 'assignment' | 'event' | 'custom',
  userId: string,
  reminderTitle: string,
  triggerDateTime: Date,
  reminderConfigs: IReminderConfig[]
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    await dbConnect()

    // Create Reminder documents for each config
    for (const config of reminderConfigs) {
      if (!config.enabled) continue

      // Trigger time is the datetime provided (not calculated from deadline)
      if (triggerDateTime > new Date()) {
        await Reminder.create({
          user: new mongoose.Types.ObjectId(userId),
          title: reminderTitle,
          relatedTo: entityType,
          relatedId: new mongoose.Types.ObjectId(entityId),
          triggerTime: triggerDateTime,
          isSent: false,
          emailSent: false,
          channel: config.notificationType,
        })
      }
    }

    return { success: true, message: 'Reminders created successfully' }
  } catch (error: any) {
    console.error(`Create ${entityType} Reminders Error:`, error)
    return { success: false, error: error.message || `Failed to create ${entityType} reminders` }
  }
}

/**
 * Delete all reminders for an entity
 */
export async function deleteEntityReminders(
  entityId: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    await dbConnect()

    await Reminder.deleteMany({
      relatedId: new mongoose.Types.ObjectId(entityId),
    })

    return { success: true, message: 'Reminders deleted successfully' }
  } catch (error: any) {
    console.error('Delete Entity Reminders Error:', error)
    return { success: false, error: error.message || 'Failed to delete reminders' }
  }
}

/**
 * Get all pending reminders for a user (for dashboard display)
 */
export async function getUserPendingReminders(
  userId: string
): Promise<{ success: boolean; reminders?: any[]; error?: string }> {
  try {
    await dbConnect()

    const now = new Date()
    const reminders = await Reminder.find({
      user: new mongoose.Types.ObjectId(userId),
      isSent: false,
      triggerTime: { $gte: now },
    }).sort({ triggerTime: 1 })

    return {
      success: true,
      reminders: JSON.parse(JSON.stringify(reminders)),
    }
  } catch (error: any) {
    console.error('Get User Pending Reminders Error:', error)
    return { success: false, error: error.message || 'Failed to fetch pending reminders' }
  }
}
```

#### 2.2 Update emailService.ts (Add Support for Multiple Reminder Types)

**File:** `src/services/emailService.ts`

**What to do:** Add these new email functions

```typescript
// ADD THESE FUNCTIONS to emailService.ts

/**
 * Send habit check-in reminder email
 */
export async function sendHabitReminderEmail(
  email: string,
  userName: string,
  habitName: string,
  scheduledTime: string
): Promise<{ success: boolean; message?: string }> {
  try {
    // Using your existing email setup (Nodemailer/SendGrid/etc)
    const mailOptions = {
      to: email,
      subject: `🎯 Time to check your habit: ${habitName}`,
      html: `
        <h2>Hi ${userName}!</h2>
        <p>It's time to complete your daily habit: <strong>${habitName}</strong></p>
        <p>Scheduled for: ${scheduledTime}</p>
        <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/habits">Complete Now →</a></p>
        <p>Keep up your streak! 🔥</p>
      `,
    }
    
    // Use your email sender (example with Nodemailer)
    // await transporter.sendMail(mailOptions)
    
    return { success: true, message: 'Habit reminder email sent' }
  } catch (error) {
    console.error('Send Habit Reminder Email Error:', error)
    return { success: false, message: 'Failed to send email' }
  }
}

/**
 * Send exam/assignment deadline reminder email
 */
export async function sendExamAssignmentReminderEmail(
  email: string,
  userName: string,
  type: 'exam' | 'assignment',
  title: string,
  dueDate: Date,
  subjectName: string
): Promise<{ success: boolean; message?: string }> {
  try {
    const daysLeft = Math.ceil(
      (new Date(dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    )

    const mailOptions = {
      to: email,
      subject: `⏰ ${type === 'exam' ? 'Exam' : 'Assignment'}: ${title} - ${daysLeft} days left`,
      html: `
        <h2>Hi ${userName}!</h2>
        <p>Reminder: You have an upcoming ${type}!</p>
        <h3>${title}</h3>
        <p><strong>Subject:</strong> ${subjectName}</p>
        <p><strong>Due Date:</strong> ${new Date(dueDate).toLocaleDateString()}</p>
        <p><strong>Time Left:</strong> ${daysLeft} day${daysLeft !== 1 ? 's' : ''}</p>
        <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/college">View Details →</a></p>
      `,
    }

    // await transporter.sendMail(mailOptions)
    
    return { success: true, message: 'Email sent' }
  } catch (error) {
    console.error('Send Exam/Assignment Reminder Email Error:', error)
    return { success: false, message: 'Failed to send email' }
  }
}

/**
 * Send schedule/timeblock reminder email
 */
export async function sendScheduleReminderEmail(
  email: string,
  userName: string,
  eventName: string,
  startTime: Date
): Promise<{ success: boolean; message?: string }> {
  try {
    const mailOptions = {
      to: email,
      subject: `📅 Your schedule: ${eventName} starting soon`,
      html: `
        <h2>Hi ${userName}!</h2>
        <p>Upcoming event in your schedule:</p>
        <h3>${eventName}</h3>
        <p><strong>Start Time:</strong> ${new Date(startTime).toLocaleString()}</p>
        <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/planner">View Schedule →</a></p>
      `,
    }

    // await transporter.sendMail(mailOptions)
    
    return { success: true, message: 'Email sent' }
  } catch (error) {
    console.error('Send Schedule Reminder Email Error:', error)
    return { success: false, message: 'Failed to send email' }
  }
}
```

---

### STEP 3: Create Server Actions

#### 3.1 Create/Update College Actions

**File:** `src/actions/collegeActions.ts` (Create if doesn't exist)

**What to do:** Add these action functions

```typescript
'use server'

import mongoose from 'mongoose'
import { auth } from '@/lib/auth'
import dbConnect from '@/lib/mongodb'
import Exam from '@/models/College' // Import IExam
import Assignment from '@/models/College' // Import IAssignment
import { createGenericReminders, deleteEntityReminders } from '@/services/reminderService'

async function checkAuth() {
  const session = await auth()
  if (!session || !session.user) {
    throw new Error('Unauthorized')
  }
  return session
}

/**
 * CREATE EXAM WITH REMINDERS
 */
export async function createExamAction(data: any) {
  try {
    const session = await checkAuth()
    await dbConnect()

    const { subject, examType, date, syllabus, reminderConfigs } = data

    const newExam = await Exam.create({
      user: new mongoose.Types.ObjectId(session.user.id),
      subject: new mongoose.Types.ObjectId(subject),
      examType,
      date: new Date(date),
      syllabus,
      reminderConfigs: reminderConfigs || [],
    })

    // Create reminders if provided
    if (reminderConfigs && reminderConfigs.length > 0) {
      await createGenericReminders(
        newExam._id.toString(),
        'exam',
        session.user.id,
        `Exam Reminder: ${examType} exam on ${subject}`,
        new Date(date), // User will set specific time
        reminderConfigs
      )
    }

    return {
      success: true,
      message: 'Exam created with reminders!',
      exam: JSON.parse(JSON.stringify(newExam)),
    }
  } catch (error: any) {
    console.error('Create Exam Error:', error)
    return { success: false, error: error.message || 'Failed to create exam' }
  }
}

/**
 * UPDATE EXAM WITH REMINDERS
 */
export async function updateExamAction(examId: string, data: any) {
  try {
    const session = await checkAuth()
    await dbConnect()

    const exam = await Exam.findOne({ _id: examId, user: session.user.id })
    if (!exam) return { success: false, error: 'Exam not found' }

    const { subject, examType, date, syllabus, reminderConfigs } = data

    exam.subject = subject || exam.subject
    exam.examType = examType || exam.examType
    exam.date = date ? new Date(date) : exam.date
    exam.syllabus = syllabus || exam.syllabus
    exam.reminderConfigs = reminderConfigs || exam.reminderConfigs

    await exam.save()

    // Delete old reminders and create new ones
    await deleteEntityReminders(examId)
    if (reminderConfigs && reminderConfigs.length > 0) {
      await createGenericReminders(
        examId,
        'exam',
        session.user.id,
        `Exam Reminder: ${examType}`,
        new Date(date),
        reminderConfigs
      )
    }

    return {
      success: true,
      message: 'Exam updated!',
      exam: JSON.parse(JSON.stringify(exam)),
    }
  } catch (error: any) {
    console.error('Update Exam Error:', error)
    return { success: false, error: error.message || 'Failed to update exam' }
  }
}

/**
 * CREATE ASSIGNMENT WITH REMINDERS
 */
export async function createAssignmentAction(data: any) {
  try {
    const session = await checkAuth()
    await dbConnect()

    const { subject, title, description, dueDate, fileUrl, reminderConfigs } = data

    const newAssignment = await Assignment.create({
      user: new mongoose.Types.ObjectId(session.user.id),
      subject: new mongoose.Types.ObjectId(subject),
      title,
      description,
      dueDate: new Date(dueDate),
      fileUrl,
      reminderConfigs: reminderConfigs || [],
      status: 'Todo',
    })

    // Create reminders
    if (reminderConfigs && reminderConfigs.length > 0) {
      await createGenericReminders(
        newAssignment._id.toString(),
        'assignment',
        session.user.id,
        `Assignment: ${title} is due soon!`,
        new Date(dueDate),
        reminderConfigs
      )
    }

    return {
      success: true,
      message: 'Assignment created with reminders!',
      assignment: JSON.parse(JSON.stringify(newAssignment)),
    }
  } catch (error: any) {
    console.error('Create Assignment Error:', error)
    return { success: false, error: error.message || 'Failed to create assignment' }
  }
}

/**
 * UPDATE ASSIGNMENT WITH REMINDERS
 */
export async function updateAssignmentAction(assignmentId: string, data: any) {
  try {
    const session = await checkAuth()
    await dbConnect()

    const assignment = await Assignment.findOne({
      _id: assignmentId,
      user: session.user.id,
    })
    if (!assignment) return { success: false, error: 'Assignment not found' }

    const { title, description, dueDate, status, grade, fileUrl, reminderConfigs } = data

    assignment.title = title || assignment.title
    assignment.description = description || assignment.description
    assignment.dueDate = dueDate ? new Date(dueDate) : assignment.dueDate
    assignment.status = status || assignment.status
    assignment.grade = grade || assignment.grade
    assignment.fileUrl = fileUrl || assignment.fileUrl
    assignment.reminderConfigs = reminderConfigs || assignment.reminderConfigs

    await assignment.save()

    // Recreate reminders
    await deleteEntityReminders(assignmentId)
    if (reminderConfigs && reminderConfigs.length > 0) {
      await createGenericReminders(
        assignmentId,
        'assignment',
        session.user.id,
        `Assignment: ${title}`,
        new Date(dueDate),
        reminderConfigs
      )
    }

    return {
      success: true,
      message: 'Assignment updated!',
      assignment: JSON.parse(JSON.stringify(assignment)),
    }
  } catch (error: any) {
    console.error('Update Assignment Error:', error)
    return { success: false, error: error.message || 'Failed to update assignment' }
  }
}
```

#### 3.2 Update Habit Actions

**File:** `src/actions/habitActions.ts`

**What to do:** Find the `createHabitAction` and `updateHabitAction` functions and add reminder support

```typescript
// FIND: export async function createHabitAction
// MODIFY IT TO INCLUDE:

export async function createHabitAction(data: any): Promise<HabitResponse> {
  try {
    const session = await checkAuth()
    await dbConnect()

    const { name, recurrenceType, recurrenceDays, reminderConfigs } = data

    const newHabit = await Habit.create({
      user: new mongoose.Types.ObjectId(session.user.id),
      name,
      recurrenceType,
      recurrenceDays: recurrenceDays || [],
      reminderConfigs: reminderConfigs || [], // ADD THIS LINE
      completedDates: [],
      streak: 0,
    })

    // CREATE REMINDERS if provided
    if (reminderConfigs && reminderConfigs.length > 0) {
      // For habits, we need to create recurring reminders
      // For now, create initial reminder for today
      const today = new Date()
      const reminderTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 8, 0, 0)
      
      await createGenericReminders(
        newHabit._id.toString(),
        'habit',
        session.user.id,
        `Time to complete: ${name}`,
        reminderTime,
        reminderConfigs
      )
    }

    return {
      success: true,
      message: 'Habit created!',
      habit: JSON.parse(JSON.stringify(newHabit)),
    }
  } catch (error: any) {
    console.error('Create Habit Action Error:', error)
    return { success: false, error: error.message || 'Failed to create habit' }
  }
}

// FIND: export async function updateHabitAction
// MODIFY IT TO INCLUDE:

export async function updateHabitAction(habitId: string, data: any): Promise<HabitResponse> {
  try {
    const session = await checkAuth()
    await dbConnect()

    const habit = await Habit.findOne({ _id: habitId, user: session.user.id })
    if (!habit) {
      return { success: false, error: 'Habit not found' }
    }

    const { name, recurrenceType, recurrenceDays, reminderConfigs } = data

    habit.name = name || habit.name
    habit.recurrenceType = recurrenceType || habit.recurrenceType
    habit.recurrenceDays = recurrenceDays || habit.recurrenceDays
    habit.reminderConfigs = reminderConfigs || habit.reminderConfigs // ADD THIS

    await habit.save()

    // UPDATE REMINDERS
    await deleteEntityReminders(habitId)
    if (reminderConfigs && reminderConfigs.length > 0) {
      const today = new Date()
      const reminderTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 8, 0, 0)
      
      await createGenericReminders(
        habitId,
        'habit',
        session.user.id,
        `Time to complete: ${name}`,
        reminderTime,
        reminderConfigs
      )
    }

    return {
      success: true,
      message: 'Habit updated!',
      habit: JSON.parse(JSON.stringify(habit)),
    }
  } catch (error: any) {
    console.error('Update Habit Action Error:', error)
    return { success: false, error: error.message || 'Failed to update habit' }
  }
}
```

#### 3.3 Update Planner Actions (for TimeBlock/Schedule Reminders)

**File:** `src/actions/plannerActions.ts`

**What to do:** Add reminder support to TimeBlock creation

```typescript
// FIND: export async function createTimeBlockAction
// ADD REMINDER SUPPORT:

export async function createTimeBlockAction(data: any): Promise<TimeBlockResponse> {
  try {
    const session = await checkAuth()
    await dbConnect()

    const { title, startTime, endTime, category, reminderConfigs } = data

    const newTimeBlock = await TimeBlock.create({
      user: new mongoose.Types.ObjectId(session.user.id),
      title,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      category,
      reminderConfigs: reminderConfigs || [], // ADD THIS
    })

    // CREATE REMINDERS
    if (reminderConfigs && reminderConfigs.length > 0) {
      await createGenericReminders(
        newTimeBlock._id.toString(),
        'event',
        session.user.id,
        `Upcoming: ${title}`,
        new Date(startTime),
        reminderConfigs
      )
    }

    return {
      success: true,
      message: 'TimeBlock created!',
      timeBlock: JSON.parse(JSON.stringify(newTimeBlock)),
    }
  } catch (error: any) {
    console.error('Create TimeBlock Error:', error)
    return { success: false, error: error.message || 'Failed to create timeblock' }
  }
}
```

---

### STEP 4: Create Frontend Components

#### 4.1 Create Reusable ReminderConfig Component

**File:** `src/components/ui/ReminderConfigPanel.tsx` (Create new file)

```typescript
'use client'

import React, { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Label } from '@/components/ui/Label'
import { Input } from '@/components/ui/Input'
import { getReminderPresets } from '@/lib/reminderUtils'

interface ReminderConfig {
  enabled: boolean
  timeBefore: number
  notificationType: 'email' | 'in-app' | 'both'
}

interface ReminderConfigPanelProps {
  reminders: ReminderConfig[]
  onRemindersChange: (reminders: ReminderConfig[]) => void
  label?: string
}

export default function ReminderConfigPanel({
  reminders,
  onRemindersChange,
  label = 'Reminders',
}: ReminderConfigPanelProps) {
  const presets = getReminderPresets()

  const addReminder = () => {
    const newReminder: ReminderConfig = {
      enabled: true,
      timeBefore: 1440, // 1 day
      notificationType: 'both',
    }
    onRemindersChange([...reminders, newReminder])
  }

  const removeReminder = (index: number) => {
    onRemindersChange(reminders.filter((_, i) => i !== index))
  }

  const updateReminder = (index: number, field: string, value: any) => {
    const updated = [...reminders]
    ;(updated[index] as any)[field] = value
    onRemindersChange(updated)
  }

  return (
    <div className="space-y-3 p-4 bg-zinc-50 dark:bg-zinc-900/30 rounded-lg border border-border">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-bold">{label}</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addReminder}
          className="gap-1"
        >
          <Plus className="w-3.5 h-3.5" /> Add
        </Button>
      </div>

      <div className="space-y-2">
        {reminders.length === 0 ? (
          <p className="text-xs text-zinc-500 italic py-2">No reminders set</p>
        ) : (
          reminders.map((reminder, idx) => (
            <div
              key={idx}
              className="p-3 bg-white dark:bg-zinc-900 border border-border rounded-lg flex items-end gap-2"
            >
              <div className="flex-1 grid grid-cols-3 gap-2">
                {/* Time Before Dropdown */}
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-zinc-600 dark:text-zinc-400">
                    When
                  </label>
                  <select
                    value={reminder.timeBefore}
                    onChange={(e) =>
                      updateReminder(idx, 'timeBefore', Number(e.target.value))
                    }
                    className="w-full h-9 px-2 rounded-md border border-border text-sm"
                  >
                    {presets.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Notification Type */}
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-zinc-600 dark:text-zinc-400">
                    Channel
                  </label>
                  <select
                    value={reminder.notificationType}
                    onChange={(e) =>
                      updateReminder(idx, 'notificationType', e.target.value)
                    }
                    className="w-full h-9 px-2 rounded-md border border-border text-sm"
                  >
                    <option value="both">Email + In-App</option>
                    <option value="email">Email Only</option>
                    <option value="in-app">In-App Only</option>
                  </select>
                </div>

                {/* Enable Toggle */}
                <div className="space-y-1 flex items-end">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={reminder.enabled}
                      onChange={(e) =>
                        updateReminder(idx, 'enabled', e.target.checked)
                      }
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-xs font-medium">Enabled</span>
                  </label>
                </div>
              </div>

              {/* Delete Button */}
              <button
                type="button"
                onClick={() => removeReminder(idx)}
                className="p-2 text-rose-500 hover:bg-rose-500/10 rounded transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
```

#### 4.2 Update Habit Form Component

**File:** `src/app/dashboard/habits/HabitsClient.tsx` (or similar)

**What to do:** Add reminder config UI when creating/editing habit

```typescript
// ADD THIS TO YOUR HABIT FORM:

import ReminderConfigPanel from '@/components/ui/ReminderConfigPanel'

// In your habit form state:
const [habitForm, setHabitForm] = useState({
  name: '',
  recurrenceType: 'daily',
  recurrenceDays: [],
  reminderConfigs: [
    { enabled: true, timeBefore: 1440, notificationType: 'both' }
  ] // ADD THIS
})

// In your form JSX:
<ReminderConfigPanel
  reminders={habitForm.reminderConfigs}
  onRemindersChange={(reminders) =>
    setHabitForm({ ...habitForm, reminderConfigs: reminders })
  }
  label="Habit Check-in Reminders"
/>

// In your submit handler:
const handleCreateHabit = (e: React.FormEvent) => {
  e.preventDefault()
  startTransition(async () => {
    const res = await createHabitAction({
      name: habitForm.name,
      recurrenceType: habitForm.recurrenceType,
      recurrenceDays: habitForm.recurrenceDays,
      reminderConfigs: habitForm.reminderConfigs // PASS THIS
    })
    // ... handle response
  })
}
```

#### 4.3 Update Assignment/Exam Form

**File:** `src/app/dashboard/college/CollegeClient.tsx`

**What to do:** Similar to habit, add ReminderConfigPanel to assignment/exam forms

```typescript
// IN ASSIGNMENT FORM:
import ReminderConfigPanel from '@/components/ui/ReminderConfigPanel'

const [assignmentForm, setAssignmentForm] = useState({
  title: '',
  description: '',
  subject: '',
  dueDate: '',
  reminderConfigs: [
    { enabled: true, timeBefore: 1440, notificationType: 'both' },
    { enabled: true, timeBefore: 10080, notificationType: 'email' } // 1 week
  ]
})

// IN FORM JSX:
<ReminderConfigPanel
  reminders={assignmentForm.reminderConfigs}
  onRemindersChange={(reminders) =>
    setAssignmentForm({ ...assignmentForm, reminderConfigs: reminders })
  }
  label="Assignment Due Reminders"
/>

// IN SUBMIT:
const res = await createAssignmentAction({
  title: assignmentForm.title,
  subject: assignmentForm.subject,
  dueDate: assignmentForm.dueDate,
  reminderConfigs: assignmentForm.reminderConfigs
})
```

---

### STEP 5: Set Up Cron Job for Processing Reminders

#### 5.1 Create or Update Cron Endpoint

**File:** `src/app/api/cron/reminders/route.ts` (Create if doesn't exist)

```typescript
import { processPendingReminders } from '@/services/reminderService'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  // Security: Verify cron token (use Vercel Cron or similar)
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await processPendingReminders()
    
    return NextResponse.json({
      success: true,
      message: 'Reminders processed',
      ...result,
    })
  } catch (error: any) {
    console.error('Cron Error:', error)
    return NextResponse.json(
      { error: 'Failed to process reminders', details: error.message },
      { status: 500 }
    )
  }
}
```

#### 5.2 Configure Vercel Cron (if using Vercel)

**File:** `vercel.json` (Create if doesn't exist)

```json
{
  "crons": [
    {
      "path": "/api/cron/reminders",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

**Or use an external service like:**
- **EasyCron** (easycron.com)
- **AWS EventBridge**
- **Node-cron** (for local development)

---

## Feature-Specific Implementation

### Feature 1: Release Calendar Reminders (Creator Hub)

#### Models Needed
- Create `src/models/ReleaseEvent.ts`

```typescript
import mongoose, { Schema, Document, Model } from 'mongoose'
import { IReminderConfig } from './Task'

export interface IReleaseEvent extends Document {
  user: mongoose.Types.ObjectId
  title: string
  description?: string
  releaseDate: Date
  status: 'Planned' | 'Scheduled' | 'Released' | 'Postponed'
  reminderConfigs: IReminderConfig[]
  createdAt: Date
  updatedAt: Date
}

const ReleaseEventSchema: Schema<IReleaseEvent> = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String },
    releaseDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ['Planned', 'Scheduled', 'Released', 'Postponed'],
      default: 'Planned',
    },
    reminderConfigs: {
      type: [
        {
          enabled: { type: Boolean, default: true },
          timeBefore: { type: Number, required: true },
          notificationType: { type: String, enum: ['email', 'in-app', 'both'], default: 'both' },
          emailSent: { type: Boolean, default: false },
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
)

const ReleaseEvent: Model<IReleaseEvent> = mongoose.models.ReleaseEvent || 
  mongoose.model<IReleaseEvent>('ReleaseEvent', ReleaseEventSchema)

export default ReleaseEvent
```

#### Server Action

```typescript
// In src/actions/creatorHubActions.ts

export async function createReleaseEventAction(data: any) {
  try {
    const session = await checkAuth()
    await dbConnect()

    const { title, description, releaseDate, reminderConfigs } = data

    const newEvent = await ReleaseEvent.create({
      user: new mongoose.Types.ObjectId(session.user.id),
      title,
      description,
      releaseDate: new Date(releaseDate),
      reminderConfigs: reminderConfigs || [],
      status: 'Planned',
    })

    if (reminderConfigs && reminderConfigs.length > 0) {
      await createGenericReminders(
        newEvent._id.toString(),
        'event',
        session.user.id,
        `🚀 Release Coming: ${title}`,
        new Date(releaseDate),
        reminderConfigs
      )
    }

    return { success: true, event: JSON.parse(JSON.stringify(newEvent)) }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
```

---

### Feature 2: Subject's Daily Log Reminders

#### Concept
Remind user to log their day's learnings/notes for each subject

#### Implementation

```typescript
// In src/actions/collegeActions.ts - Add new function:

export async function createSubjectDailyLogReminderAction(
  subjectId: string,
  time: string, // "20:00" format
  reminderConfigs: IReminderConfig[]
) {
  try {
    const session = await checkAuth()
    await dbConnect()

    const subject = await Subject.findOne({
      _id: subjectId,
      user: session.user.id,
    })
    if (!subject) return { success: false, error: 'Subject not found' }

    // Create daily reminder at specified time
    const today = new Date()
    const [hours, minutes] = time.split(':').map(Number)
    const reminderTime = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      hours,
      minutes,
      0
    )

    await createGenericReminders(
      subjectId,
      'custom',
      session.user.id,
      `📚 Time to log your learnings for ${subject.name}`,
      reminderTime,
      reminderConfigs
    )

    // Store the time preference in subject
    subject.dailyLogReminderTime = time
    await subject.save()

    return { success: true, message: 'Daily log reminder set!' }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
```

---

## Quick Reference: Files to Modify

```
DATABASES (Models):
├── src/models/Habit.ts                    ← Add reminderConfigs
├── src/models/TimeBlock.ts                ← Add reminderConfigs
├── src/models/College.ts                  ← Already has them ✅
└── src/models/Reminder.ts                 ← Already set up ✅

SERVICES:
├── src/services/reminderService.ts        ← Add generic functions
└── src/services/emailService.ts           ← Add email templates

ACTIONS:
├── src/actions/taskActions.ts             ← Already updated ✅
├── src/actions/habitActions.ts            ← Add reminder support
├── src/actions/collegeActions.ts          ← Create/Update with reminders
├── src/actions/plannerActions.ts          ← Add reminder support
└── src/actions/creatorHubActions.ts       ← Create for release events

COMPONENTS:
├── src/components/ui/ReminderConfigPanel.tsx  ← CREATE NEW
└── Various Client Components               ← Integrate ReminderConfigPanel

CRON:
└── src/app/api/cron/reminders/route.ts    ← CREATE NEW

CONFIG:
└── vercel.json                            ← ADD cron config
```

---

## Testing Checklist

- [ ] **Create Task with Reminder** → Check if Reminder document created in DB
- [ ] **Modify Task Reminder** → Check if old reminders deleted, new ones created
- [ ] **Create Habit with Reminder** → Verify in MongoDB
- [ ] **Create Exam with Reminder** → Verify in MongoDB
- [ ] **Create Assignment with Reminder** → Verify in MongoDB
- [ ] **Run Manual Cron** → Call `/api/cron/reminders` with proper auth
- [ ] **Verify Email Sent** → Check email logs/service
- [ ] **Verify In-App Notification** → Check notification creation
- [ ] **Check Past Trigger Time** → Ensure reminders mark as `isSent: true`

---

## Common Issues & Solutions

### Issue: Reminders not being created
**Check:**
1. `reminderConfigs` array is not empty
2. `triggerTime > new Date()` (in the future)
3. Database connection is working

### Issue: Emails not sending
**Check:**
1. SMTP/Email service credentials in `.env`
2. `emailService.ts` has transporter configured
3. Email function is awaited properly
4. User has valid email in database

### Issue: Cron not running
**Check:**
1. `CRON_SECRET` env variable set
2. Cron endpoint is publicly accessible
3. Using correct schedule format
4. Cron service (Vercel/EasyCron) is active

---

## Summary

You now have a complete framework for implementing reminders across your entire application. The key patterns are:

1. **Add `reminderConfigs` to any model** that needs reminders
2. **Call `createGenericReminders()` in server actions** when creating entities
3. **Add `ReminderConfigPanel` component** to any form
4. **Cron job handles the actual sending** via `processPendingReminders()`

Good luck implementing! 🚀
