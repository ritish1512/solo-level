import mongoose, { Schema, Document, Model } from 'mongoose'
import { IReminderConfig } from './Task'

export interface IProject extends Document {
  user: mongoose.Types.ObjectId
  title: string
  description?: string
  githubLink?: string
  demoLink?: string
  deploymentLink?: string
  techStack: string[]
  screenshots: string[] // Cloudinary URLs
  notes?: string
  deadline?: Date // Project deadline
  reminderConfigs: IReminderConfig[]
  reminderSent?: boolean // Track if reminder was sent
  createdAt: Date
  updatedAt: Date
}

const ProjectSchema: Schema<IProject> = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Project title is required'],
      trim: true,
    },
    description: {
      type: String,
      required: false,
    },
    githubLink: {
      type: String,
      required: false,
      trim: true,
    },
    demoLink: {
      type: String,
      required: false,
      trim: true,
    },
    deploymentLink: {
      type: String,
      required: false,
      trim: true,
    },
    techStack: {
      type: [String],
      default: [],
    },
    screenshots: {
      type: [String],
      default: [],
    },
    notes: {
      type: String,
      required: false,
    },
    deadline: {
      type: Date,
      required: false,
    },
    reminderConfigs: {
      type: [
        {
          enabled: { type: Boolean, default: true },
          reminderTime: { type: Date, required: true },
          message: { type: String, required: false },
          notificationType: { type: String, enum: ['email', 'in-app', 'both'], default: 'both' },
          emailSent: { type: Boolean, default: false },
        },
      ],
      default: [],
    },
    reminderSent: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
)

ProjectSchema.index({ user: 1, title: 1 })
ProjectSchema.index({ deadline: 1, reminderSent: 1 })
ProjectSchema.index({ user: 1, updatedAt: -1 })
ProjectSchema.index({ techStack: 1 })

const Project: Model<IProject> = mongoose.models.Project || mongoose.model<IProject>('Project', ProjectSchema)

export default Project
