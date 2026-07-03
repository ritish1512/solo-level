import mongoose, { Schema, Document, Model } from 'mongoose'

export interface INotification extends Document {
  user?: mongoose.Types.ObjectId // Null indicates site-wide global broadcast
  title: string
  message: string
  type: 'info' | 'warning' | 'alert' | 'system'
  isRead: boolean
  scheduledFor: Date
  createdAt: Date
  updatedAt: Date
}

const NotificationSchema: Schema<INotification> = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false, // Optional for global broadcast notifications
    },
    title: {
      type: String,
      required: [true, 'Notification title is required'],
      trim: true,
    },
    message: {
      type: String,
      required: [true, 'Notification description is required'],
    },
    type: {
      type: String,
      enum: ['info', 'warning', 'alert', 'system'],
      default: 'info',
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    scheduledFor: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
)

NotificationSchema.index({ user: 1, scheduledFor: -1 })
NotificationSchema.index({ scheduledFor: -1 })

const Notification: Model<INotification> =
  mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema)

export default Notification
