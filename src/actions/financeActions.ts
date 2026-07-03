'use server'

import mongoose from 'mongoose'
import { auth } from '@/lib/auth'
import dbConnect from '@/lib/mongodb'
import Transaction from '@/models/Transaction'
import Invoice from '@/models/Invoice'
import User from '@/models/User'

export interface FinanceResponse {
  success: boolean
  message?: string
  error?: string
  transaction?: any
  transactions?: any[]
  invoice?: any
  invoices?: any[]
}

// Session authentication check
async function checkAuth() {
  const session = await auth()
  if (!session || !session.user) {
    throw new Error('Unauthorized. Please log in.')
  }
  return session
}

// --- TRANSACTION ACTIONS ---
export async function createTransactionAction(data: any): Promise<FinanceResponse> {
  try {
    const session = await checkAuth()
    const { type, amount, category, description, date } = data

    if (!type || !amount || !category) {
      return { success: false, error: 'Type, Amount, and Category are required.' }
    }

    await dbConnect()

    const newTx = await Transaction.create({
      user: new mongoose.Types.ObjectId(session.user.id),
      type,
      amount: Number(amount),
      category: category.trim(),
      description,
      date: date ? new Date(date) : new Date(),
    })

    return {
      success: true,
      message: 'Transaction logged!',
      transaction: JSON.parse(JSON.stringify(newTx)),
    }
  } catch (error: any) {
    console.error('Create Transaction Error:', error)
    return { success: false, error: error.message || 'Failed to log transaction.' }
  }
}

export async function getTransactionsAction(): Promise<FinanceResponse> {
  try {
    const session = await checkAuth()
    await dbConnect()

    const txs = await Transaction.find({ user: session.user.id }).sort({ date: -1 })
    return {
      success: true,
      transactions: JSON.parse(JSON.stringify(txs)),
    }
  } catch (error: any) {
    console.error('Get Transactions Error:', error)
    return { success: false, error: error.message || 'Failed to fetch transactions.' }
  }
}

export async function deleteTransactionAction(id: string): Promise<FinanceResponse> {
  try {
    const session = await checkAuth()
    await dbConnect()

    await Transaction.deleteOne({ _id: id, user: session.user.id })

    return {
      success: true,
      message: 'Transaction deleted.',
    }
  } catch (error: any) {
    console.error('Delete Transaction Error:', error)
    return { success: false, error: error.message || 'Failed to delete transaction.' }
  }
}

// --- INVOICE ACTIONS ---
export async function createInvoiceAction(data: any): Promise<FinanceResponse> {
  try {
    const session = await checkAuth()
    const { clientName, clientEmail, amount, description } = data

    if (!clientName || !clientEmail || !amount || !description) {
      return { success: false, error: 'All fields are required to generate invoice.' }
    }

    await dbConnect()

    const newInvoice = await Invoice.create({
      user: new mongoose.Types.ObjectId(session.user.id),
      clientName: clientName.trim(),
      clientEmail: clientEmail.trim(),
      amount: Number(amount),
      description: description.trim(),
      status: 'Unpaid',
    })

    return {
      success: true,
      message: 'Invoice generated successfully!',
      invoice: JSON.parse(JSON.stringify(newInvoice)),
    }
  } catch (error: any) {
    console.error('Create Invoice Error:', error)
    return { success: false, error: error.message || 'Failed to generate invoice.' }
  }
}

export async function getInvoicesAction(): Promise<FinanceResponse> {
  try {
    const session = await checkAuth()
    await dbConnect()

    const invoices = await Invoice.find({ user: session.user.id }).sort({ createdAt: -1 })
    return {
      success: true,
      invoices: JSON.parse(JSON.stringify(invoices)),
    }
  } catch (error: any) {
    console.error('Get Invoices Error:', error)
    return { success: false, error: error.message || 'Failed to fetch invoices.' }
  }
}

export async function deleteInvoiceAction(id: string): Promise<FinanceResponse> {
  try {
    const session = await checkAuth()
    await dbConnect()

    await Invoice.deleteOne({ _id: id, user: session.user.id })

    return {
      success: true,
      message: 'Invoice removed.',
    }
  } catch (error: any) {
    console.error('Delete Invoice Error:', error)
    return { success: false, error: error.message || 'Failed to delete invoice.' }
  }
}

// --- FALLBACK MOCK CHECKOUT PAYMENT ---
// Marks invoice paid and rewards +50 XP
export async function markInvoicePaidAction(id: string): Promise<FinanceResponse> {
  try {
    const session = await checkAuth()
    await dbConnect()

    const invoice = await Invoice.findOne({ _id: id, user: session.user.id })
    if (!invoice) {
      return { success: false, error: 'Invoice not found.' }
    }

    if (invoice.status === 'Paid') {
      return { success: false, error: 'Invoice has already been paid.' }
    }

    invoice.status = 'Paid'
    await invoice.save()

    // Add Income transaction log automatically!
    await Transaction.create({
      user: session.user.id,
      type: 'Income',
      amount: invoice.amount,
      category: 'Freelancing',
      description: `Payment for invoice: ${invoice.description}`,
      date: new Date(),
    })

    // Award +50 XP to the user for billing completion
    const user = await User.findById(session.user.id)
    if (user) {
      user.xp += 50
      const nextLevel = Math.floor(user.xp / 100) + 1
      if (nextLevel > user.level) {
        user.level = nextLevel
      }
      await user.save()
    }

    return {
      success: true,
      message: 'Invoice paid successfully! Reward: +50 XP',
      invoice: JSON.parse(JSON.stringify(invoice)),
    }
  } catch (error: any) {
    console.error('Verify Fallback Payment Error:', error)
    return { success: false, error: error.message || 'Failed to update payment status.' }
  }
}
