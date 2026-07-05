import mongoose, { Schema, Document, Model } from 'mongoose'
import { IReminderConfig } from './Task'

export type ContentPlatform = 'YouTube' | 'Instagram' | 'Twitter' | 'LinkedIn' | 'Portfolio' | 'Other'
export type ContentStatus = 'Idea' | 'Scripting' | 'Recording' | 'Editing' | 'Posted'

export interface IContentIdea extends Document {
  user: mongoose.Types.ObjectId
  title: string
  platform: ContentPlatform
  status: ContentStatus
  script?: string
  scheduledDate?: Date
  notes?: string
  mediaUrl?: string
  reminderConfigs: IReminderConfig[]
  lastReminderSentAt?: Date // Track last reminder email sent
  createdAt: Date
  updatedAt: Date
}

const ContentIdeaSchema: Schema<IContentIdea> = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Content title is required'],
      trim: true,
    },
    platform: {
      type: String,
      enum: ['YouTube', 'Instagram', 'Twitter', 'LinkedIn', 'Portfolio', 'Other'],
      default: 'YouTube',
    },
    status: {
      type: String,
      enum: ['Idea', 'Scripting', 'Recording', 'Editing', 'Posted'],
      default: 'Idea',
    },
    script: {
      type: String,
      required: false,
    },
    scheduledDate: {
      type: Date,
      required: false,
    },
    notes: {
      type: String,
      required: false,
    },
    mediaUrl: {
      type: String,
      required: false,
      trim: true,
    },
    reminderConfigs: {
      type: [
        {
          enabled: { type: Boolean, default: true },
          reminderTime: { type: Date, required: true }, // Specific date/time
          message: { type: String, required: false },
          notificationType: { type: String, enum: ['email', 'in-app', 'both'], default: 'both' },
          emailSent: { type: Boolean, default: false },
        },
      ],
      default: [],
    },
    lastReminderSentAt: {
      type: Date,
      required: false,
    },
  },
  {
    timestamps: true,
  }
)

ContentIdeaSchema.index({ user: 1, scheduledDate: 1 })
ContentIdeaSchema.index({ user: 1, status: 1, updatedAt: -1 })
ContentIdeaSchema.index({ scheduledDate: 1, lastReminderSentAt: 1 })
ContentIdeaSchema.index({ platform: 1, status: 1 })
ContentIdeaSchema.index({ user: 1, platform: 1 })

const ContentIdea: Model<IContentIdea> =
  mongoose.models.ContentIdea || mongoose.model<IContentIdea>('ContentIdea', ContentIdeaSchema)

export default ContentIdea
