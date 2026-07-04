'use client'

import React from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface Props {
  initialTransactions: any[]
}

export default function FinanceHistoryClient({ initialTransactions }: Props) {
  const transactions = initialTransactions || []

  // Totals
  const totalIncome = transactions.filter(t => t.type === 'Income').reduce((s, t) => s + t.amount, 0)
  const totalExpense = transactions.filter(t => t.type === 'Expense').reduce((s, t) => s + t.amount, 0)

  // Category breakdown (expenses)
  const categoryMap: Record<string, number> = {}
  transactions.filter(t => t.type === 'Expense').forEach(t => {
    const k = t.category || 'Other'
    categoryMap[k] = (categoryMap[k] || 0) + t.amount
  })
  const categoryEntries = Object.entries(categoryMap).sort((a, b) => b[1] - a[1])
  const topCategoryTotal = categoryEntries.reduce((s, e) => s + e[1], 0) || 1

  // Weekly trend (last 7 days)
  const now = new Date()
  const last7 = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(now)
    d.setDate(now.getDate() - (6 - i))
    return d
  })

  const dailyTotals = last7.map(d => {
    const key = d.toISOString().slice(0,10)
    const sum = transactions.filter(t => new Date(t.date).toISOString().slice(0,10) === key).reduce((s, t) => s + (t.type === 'Income' ? t.amount : -t.amount), 0)
    return { date: key, sum }
  })

  const maxDaily = Math.max(...dailyTotals.map(d => Math.abs(d.sum)), 1)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Finance Analytics</h1>
          <p className="text-sm text-zinc-500">Overview similar to PhonePe analytics — breakdowns and trends</p>
        </div>
        <div>
          <Link href="/dashboard/finance">
            <Button variant="ghost" size="sm" className="flex items-center gap-2"><ArrowLeft /> Back</Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-xs uppercase text-zinc-400 font-bold">Total Income</p>
            <div className="mt-2 text-3xl font-extrabold">₹{totalIncome.toLocaleString()}</div>
            <p className="text-xs text-zinc-500 mt-1">Net earnings across all time</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <p className="text-xs uppercase text-zinc-400 font-bold">Total Expense</p>
            <div className="mt-2 text-3xl font-extrabold text-rose-500">₹{totalExpense.toLocaleString()}</div>
            <p className="text-xs text-zinc-500 mt-1">Total spending across all time</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <p className="text-xs uppercase text-zinc-400 font-bold">Net Balance</p>
            <div className="mt-2 text-3xl font-extrabold">₹{(totalIncome - totalExpense).toLocaleString()}</div>
            <p className="text-xs text-zinc-500 mt-1">Income minus expenses</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Expense Breakdown</CardTitle>
            <CardDescription>Top categories</CardDescription>
          </CardHeader>
          <CardContent>
            {categoryEntries.length === 0 ? (
              <p className="text-xs text-zinc-500 italic">No expenses recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {categoryEntries.map(([cat, amt]) => {
                  const pct = Math.round((amt / topCategoryTotal) * 100)
                  return (
                    <div key={cat} className="space-y-1">
                      <div className="flex justify-between text-sm font-bold">
                        <div>{cat}</div>
                        <div>₹{amt.toLocaleString()}</div>
                      </div>
                      <div className="w-full bg-zinc-100 h-3 rounded overflow-hidden">
                        <div className="bg-rose-500 h-3" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Last 7 Days Trend</CardTitle>
            <CardDescription>Daily net (income - expense)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2 h-36">
              {dailyTotals.map(d => {
                const height = Math.round((Math.abs(d.sum) / maxDaily) * 100)
                const positive = d.sum >= 0
                return (
                  <div key={d.date} className="flex flex-col items-center w-full">
                    <div className={`w-full rounded-t ${positive ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ height: `${height}%`, minHeight: 2 }} />
                    <div className="text-[10px] mt-2">{new Date(d.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>Quick list to inspect individual items</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {transactions.slice(0, 20).map(tx => (
                <div key={tx._id} className="flex justify-between items-center p-2 border border-border rounded">
                  <div>
                    <div className="text-sm font-bold">{tx.type === 'Income' ? (tx.source || 'Income') : (tx.description || tx.category)}</div>
                    <div className="text-[10px] text-zinc-400">{new Date(tx.date).toLocaleString()}</div>
                  </div>
                  <div className={`font-mono font-bold ${tx.type === 'Income' ? 'text-emerald-500' : 'text-rose-500'}`}>{tx.type === 'Income' ? `+₹${tx.amount}` : `-₹${tx.amount}`}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
