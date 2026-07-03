import mongoose, { Schema, Document, Model } from 'mongoose'

export interface ITransaction extends Document {
  user: mongoose.Types.ObjectId
  type: 'Income' | 'Expense'
  amount: number
  category: string
  description?: string
  date: Date
  createdAt: Date
  updatedAt: Date
}

const TransactionSchema: Schema<ITransaction> = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['Income', 'Expense'],
      required: true,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: 0.01,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
    },
    description: {
      type: String,
      required: false,
    },
    date: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  {
    timestamps: true,
  }
)

TransactionSchema.index({ user: 1, date: -1 })

const Transaction: Model<ITransaction> = mongoose.models.Transaction || mongoose.model<ITransaction>('Transaction', TransactionSchema)

export default Transaction
