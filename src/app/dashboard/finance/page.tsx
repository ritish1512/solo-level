import React from 'react'
import { auth } from '@/lib/auth'
import dbConnect from '@/lib/mongodb'
import Transaction from '@/models/Transaction'
import Invoice from '@/models/Invoice'
import FinanceClient from './FinanceClient'

export const dynamic = 'force-dynamic'

export default async function FinancePage() {
  const session = await auth()
  
  if (!session || !session.user) {
    return null
  }

  await dbConnect()

  const userId = session.user.id

  // Fetch transactions and invoices
  const transactions = await Transaction.find({ user: userId }).sort({ date: -1 })
  const invoices = await Invoice.find({ user: userId }).sort({ createdAt: -1 })

  return (
    <FinanceClient 
      initialTransactions={JSON.parse(JSON.stringify(transactions))}
      initialInvoices={JSON.parse(JSON.stringify(invoices))}
    />
  )
}
