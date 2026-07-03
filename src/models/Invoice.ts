import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IInvoice extends Document {
  user: mongoose.Types.ObjectId
  clientName: string
  clientEmail: string
  amount: number
  description: string
  status: 'Unpaid' | 'Paid'
  paymentId?: string // Razorpay payment reference
  orderId?: string // Razorpay order reference
  dueDate?: Date // Due date for payment
  reminderSent?: boolean // Track if reminder was sent
  createdAt: Date
  updatedAt: Date
}

const InvoiceSchema: Schema<IInvoice> = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    clientName: {
      type: String,
      required: [true, 'Client name is required'],
      trim: true,
    },
    clientEmail: {
      type: String,
      required: [true, 'Client email is required'],
      trim: true,
    },
    amount: {
      type: Number,
      required: [true, 'Billing amount is required'],
      min: 1, // Razorpay requires minimum 1 unit (e.g. 1 INR)
    },
    description: {
      type: String,
      required: [true, 'Invoice description is required'],
    },
    status: {
      type: String,
      enum: ['Unpaid', 'Paid'],
      default: 'Unpaid',
      required: true,
    },
    paymentId: {
      type: String,
      required: false,
    },
    orderId: {
      type: String,
      required: false,
    },
    dueDate: {
      type: Date,
      required: false,
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

InvoiceSchema.index({ user: 1, status: 1 })
InvoiceSchema.index({ dueDate: 1, reminderSent: 1 })

const Invoice: Model<IInvoice> = mongoose.models.Invoice || mongoose.model<IInvoice>('Invoice', InvoiceSchema)

export default Invoice
