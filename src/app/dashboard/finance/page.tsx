import React from 'react'
import { auth } from '@/lib/auth'
import dbConnect from '@/lib/mongodb'
import Transaction from '@/models/Transaction'
import FinanceClient from './FinanceClient'
import { verifyFeature } from '@/lib/checkFeature'

export const dynamic = 'force-dynamic'

export default async function FinancePage() {
  await verifyFeature('finance')
  
  const session = await auth()
  
  if (!session || !session.user) {
    return null
  }

  await dbConnect()

  const userId = session.user.id

  // Fetch transactions only (budget-focused)
  const transactions = await Transaction.find({ user: userId }).sort({ date: -1 })

  return (
    <FinanceClient initialTransactions={JSON.parse(JSON.stringify(transactions))} initialInvoices={[]} />
  )
}
