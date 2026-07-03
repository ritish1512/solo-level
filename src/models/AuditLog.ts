import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IAuditLog extends Document {
  admin: mongoose.Types.ObjectId
  action: string
  target?: string
  collectionName?: string
  details?: string
  ipAddress?: string
  browser?: string
  device?: string
  result: 'Success' | 'Failure'
  createdAt: Date
  updatedAt: Date
}

const AuditLogSchema: Schema<IAuditLog> = new Schema(
  {
    admin: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    action: {
      type: String,
      required: [true, 'Action is required'],
      trim: true,
    },
    target: {
      type: String,
      required: false,
      trim: true,
    },
    collectionName: {
      type: String,
      required: false,
      trim: true,
    },
    details: {
      type: String,
      required: false,
    },
    ipAddress: {
      type: String,
      required: false,
    },
    browser: {
      type: String,
      required: false,
    },
    device: {
      type: String,
      required: false,
    },
    result: {
      type: String,
      enum: ['Success', 'Failure'],
      required: true,
      default: 'Success',
    },
  },
  {
    timestamps: true,
  }
)

AuditLogSchema.index({ admin: 1, createdAt: -1 })
AuditLogSchema.index({ action: 1, createdAt: -1 })
AuditLogSchema.index({ target: 1 })

const AuditLog: Model<IAuditLog> =
  mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', AuditLogSchema)

export default AuditLog
