import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IBug extends Document {
  user: mongoose.Types.ObjectId
  project: mongoose.Types.ObjectId // Reference to Project
  title: string
  description?: string
  severity: 'Low' | 'Medium' | 'High' | 'Critical'
  status: 'Open' | 'In Progress' | 'Resolved'
  createdAt: Date
  updatedAt: Date
}

const BugSchema: Schema<IBug> = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    project: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Bug summary is required'],
      trim: true,
    },
    description: {
      type: String,
      required: false,
    },
    severity: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Critical'],
      default: 'Medium',
      required: true,
    },
    status: {
      type: String,
      enum: ['Open', 'In Progress', 'Resolved'],
      default: 'Open',
      required: true,
    },
  },
  {
    timestamps: true,
  }
)

BugSchema.index({ project: 1, status: 1 })

const Bug: Model<IBug> = mongoose.models.Bug || mongoose.model<IBug>('Bug', BugSchema)

export default Bug
