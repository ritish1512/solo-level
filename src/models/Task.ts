import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IReminderConfig {
  enabled: boolean
  timeBefore: number // minutes before deadline
  notificationType: 'email' | 'in-app' | 'both'
  emailSent?: boolean
}

export interface ITask extends Document {
  user: mongoose.Types.ObjectId
  title: string
  description?: string
  category: 'Study' | 'Projects' | 'College' | 'Assignments' | 'LeetCode' | 'Freelancing' | 'Content' | 'Health' | 'Finance' | 'Personal'
  priority: 'Low' | 'Medium' | 'High'
  difficulty: 'Easy' | 'Medium' | 'Hard'
  energyRequired: 'Low' | 'Medium' | 'High'
  status: 'Todo' | 'In Progress' | 'Testing' | 'Completed'
  deadline: Date
  estimatedTime?: number // In minutes
  tags: string[]
  notes?: string
  progress: number // 0 to 100
  reminderOffset?: number // minutes before deadline, e.g., 10, 30, 60, 1440 (deprecated, use reminderConfigs)
  reminderSent?: boolean // Track if email reminder was sent (deprecated)
  reminderConfigs: IReminderConfig[] // New: multiple reminders per task
  attachments: string[] // Cloudinary URLs
  project?: mongoose.Types.ObjectId // Reference to Project
  createdAt: Date
  updatedAt: Date
}

const TaskSchema: Schema<ITask> = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
    },
    description: {
      type: String,
      required: false,
    },
    category: {
      type: String,
      enum: ['Study', 'Projects', 'College', 'Assignments', 'LeetCode', 'Freelancing', 'Content', 'Health', 'Finance', 'Personal'],
      required: true,
      default: 'Personal',
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High'],
      required: true,
      default: 'Medium',
    },
    difficulty: {
      type: String,
      enum: ['Easy', 'Medium', 'Hard'],
      required: true,
      default: 'Medium',
    },
    energyRequired: {
      type: String,
      enum: ['Low', 'Medium', 'High'],
      required: true,
      default: 'Medium',
    },
    status: {
      type: String,
      enum: ['Todo', 'In Progress', 'Testing', 'Completed'],
      required: true,
      default: 'Todo',
    },
    deadline: {
      type: Date,
      required: [true, 'Deadline date is required'],
    },
    estimatedTime: {
      type: Number,
      required: false,
    },
    tags: {
      type: [String],
      default: [],
    },
    notes: {
      type: String,
      required: false,
    },
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    reminderOffset: {
      type: Number,
      required: false,
      default: 0, // 0 means no active email reminder (deprecated)
    },
    reminderSent: {
      type: Boolean,
      default: false,
    },
    reminderConfigs: {
      type: [
        {
          enabled: { type: Boolean, default: true },
          timeBefore: { type: Number, required: true }, // minutes
          notificationType: { type: String, enum: ['email', 'in-app', 'both'], default: 'both' },
          emailSent: { type: Boolean, default: false },
        },
      ],
      default: [],
    },
    attachments: {
      type: [String],
      default: [],
    },
    project: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: false,
    },
  },
  {
    timestamps: true,
  }
)

// Index for query optimization
TaskSchema.index({ user: 1, deadline: 1 })
TaskSchema.index({ deadline: 1, reminderOffset: 1, reminderSent: 1 })

const Task: Model<ITask> = mongoose.models.Task || mongoose.model<ITask>('Task', TaskSchema)

export default Task
