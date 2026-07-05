import mongoose, { Schema, Document, Model } from 'mongoose'
import { IReminderConfig, IRecurringReminderConfig } from './Task'

export type HabitRecurrenceType = 'daily' | 'weekdays' | 'weekends' | 'custom-days' | 'monthly-start' | 'monthly-end'

export interface IHabit extends Document {
  user: mongoose.Types.ObjectId
  name: string
  recurrence: {
    type: HabitRecurrenceType
    days?: string[]
  }
  recurrenceType: HabitRecurrenceType
  recurrenceDays: string[]
  completedDates: string[] // Array of YYYY-MM-DD strings
  streak: number
  longestStreak: number
  reminderConfigs: IRecurringReminderConfig[] // Use recurring reminder config for habits
  createdAt: Date
  updatedAt: Date
}

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
    recurrence: {
      type: {
        type: String,
        enum: ['daily', 'weekdays', 'weekends', 'custom-days', 'monthly-start', 'monthly-end'],
        default: 'daily',
      },
      days: {
        type: [String],
        default: [],
      },
    },
    recurrenceType: {
      type: String,
      enum: ['daily', 'weekdays', 'weekends', 'custom-days', 'monthly-start', 'monthly-end'],
      default: 'daily',
    },
    recurrenceDays: {
      type: [String],
      default: [],
    },
    completedDates: {
      type: [String],
      default: [],
    },
    streak: {
      type: Number,
      default: 0,
    },
    longestStreak: {
      type: Number,
      default: 0,
    },
    reminderConfigs: {
      type: [
        {
          enabled: { type: Boolean, default: true },
          reminderTime: { type: String, required: true }, // Time only (HH:MM format) for daily recurring reminders
          message: { type: String, required: false },
          notificationType: { type: String, enum: ['email', 'in-app', 'both'], default: 'both' },
        },
      ],
      default: [],
    },
  },
  {
    timestamps: true,
  }
)

HabitSchema.index({ user: 1, name: 1 })

const Habit: Model<IHabit> = mongoose.models.Habit || mongoose.model<IHabit>('Habit', HabitSchema)

export default Habit
