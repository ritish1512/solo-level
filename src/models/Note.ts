import mongoose, { Schema, Document, Model } from 'mongoose'

export interface INote extends Document {
  user: mongoose.Types.ObjectId
  title: string
  content: string // Markdown text
  tags: string[]
  isPinned: boolean
  isArchived: boolean
  createdAt: Date
  updatedAt: Date
}

const NoteSchema: Schema<INote> = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Note title is required'],
      trim: true,
    },
    content: {
      type: String,
      default: '',
    },
    tags: {
      type: [String],
      default: [],
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
)

NoteSchema.index({ user: 1, isPinned: -1, updatedAt: -1 })

const Note: Model<INote> = mongoose.models.Note || mongoose.model<INote>('Note', NoteSchema)

export default Note
