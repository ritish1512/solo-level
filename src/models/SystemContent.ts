import mongoose, { Schema, Document, Model } from 'mongoose'

export interface ISystemContent extends Document {
  key: string // e.g. 'seo_metadata' | 'faqs' | 'changelog' | 'announcements'
  data: any
  createdAt: Date
  updatedAt: Date
}

const SystemContentSchema: Schema<ISystemContent> = new Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    data: {
      type: Schema.Types.Mixed,
      required: true,
    },
  },
  {
    timestamps: true,
  }
)

SystemContentSchema.index({ key: 1 })

const SystemContent: Model<ISystemContent> =
  mongoose.models.SystemContent || mongoose.model<ISystemContent>('SystemContent', SystemContentSchema)

export default SystemContent
