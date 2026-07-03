import mongoose, { Schema, Document, Model } from 'mongoose'

export interface ITimeBlock extends Document {
  user: mongoose.Types.ObjectId
  title: string
  startTime: string // "HH:MM"
  endTime: string // "HH:MM"
  date: string // "YYYY-MM-DD"
  isCompleted: boolean
  position: number // manual sorting ordering
  createdAt: Date
  updatedAt: Date
}

const TimeBlockSchema: Schema<ITimeBlock> = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Activity title is required'],
      trim: true,
    },
    startTime: {
      type: String,
      required: [true, 'Start time is required'],
    },
    endTime: {
      type: String,
      required: [true, 'End time is required'],
    },
    date: {
      type: String,
      required: [true, 'Date string is required'],
    },
    isCompleted: {
      type: Boolean,
      default: false,
    },
    position: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
)

TimeBlockSchema.index({ user: 1, date: 1, position: 1 })

const TimeBlock: Model<ITimeBlock> = mongoose.models.TimeBlock || mongoose.model<ITimeBlock>('TimeBlock', TimeBlockSchema)

export default TimeBlock
