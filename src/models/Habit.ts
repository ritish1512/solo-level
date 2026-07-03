import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IHabit extends Document {
  user: mongoose.Types.ObjectId
  name: string
  completedDates: string[] // Array of YYYY-MM-DD strings
  streak: number
  longestStreak: number
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
  },
  {
    timestamps: true,
  }
)

HabitSchema.index({ user: 1, name: 1 })

const Habit: Model<IHabit> = mongoose.models.Habit || mongoose.model<IHabit>('Habit', HabitSchema)

export default Habit
