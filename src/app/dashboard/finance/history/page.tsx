import React from 'react'
import { auth } from '@/lib/auth'
import dbConnect from '@/lib/mongodb'
import Transaction from '@/models/Transaction'
import FinanceHistoryClient from '../FinanceHistoryClient'

export const dynamic = 'force-dynamic'

export default async function HistoryPage() {
  const session = await auth()
  if (!session || !session.user) return null

  await dbConnect()
  const transactions = await Transaction.find({ user: session.user.id }).sort({ date: -1 })

  return (
    <FinanceHistoryClient initialTransactions={JSON.parse(JSON.stringify(transactions))} />
  )
}
