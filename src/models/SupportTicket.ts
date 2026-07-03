import mongoose, { Schema, Document, Model } from 'mongoose'

export interface ISupportTicket extends Document {
  user: mongoose.Types.ObjectId
  type: 'Contact Message' | 'Bug Report' | 'Feature Request'
  title: string
  description: string
  priority: 'Low' | 'Medium' | 'High' | 'Critical'
  status: 'Open' | 'In Progress' | 'Resolved'
  assignedTo?: mongoose.Types.ObjectId // Reference to admin User
  internalNotes?: string
  attachments: string[] // Cloudinary URLs
  createdAt: Date
  updatedAt: Date
}

const SupportTicketSchema: Schema<ISupportTicket> = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['Contact Message', 'Bug Report', 'Feature Request'],
      required: true,
      default: 'Contact Message',
    },
    title: {
      type: String,
      required: [true, 'Subject title is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Message content is required'],
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Critical'],
      required: true,
      default: 'Medium',
    },
    status: {
      type: String,
      enum: ['Open', 'In Progress', 'Resolved'],
      required: true,
      default: 'Open',
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    internalNotes: {
      type: String,
      required: false,
    },
    attachments: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
)

SupportTicketSchema.index({ status: 1, priority: -1 })
SupportTicketSchema.index({ user: 1 })

const SupportTicket: Model<ISupportTicket> =
  mongoose.models.SupportTicket || mongoose.model<ISupportTicket>('SupportTicket', SupportTicketSchema)

export default SupportTicket
