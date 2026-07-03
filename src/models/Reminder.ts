import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IReminder extends Document {
  user: mongoose.Types.ObjectId
  title: string
  triggerTime: Date
  isSent: boolean
  channel: 'both' | 'email' | 'in-app'
  createdAt: Date
  updatedAt: Date
}

const ReminderSchema: Schema<IReminder> = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Reminder title is required'],
      trim: true,
    },
    triggerTime: {
      type: Date,
      required: [true, 'Trigger time is required'],
    },
    isSent: {
      type: Boolean,
      default: false,
    },
    channel: {
      type: String,
      enum: ['both', 'email', 'in-app'],
      default: 'both',
    },
  },
  {
    timestamps: true,
  }
)

ReminderSchema.index({ triggerTime: 1, isSent: 1 })

const Reminder: Model<IReminder> = mongoose.models.Reminder || mongoose.model<IReminder>('Reminder', ReminderSchema)

export default Reminder
