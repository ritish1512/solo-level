 'use client'

import React, { useState, useTransition, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, Wallet, ArrowUpRight, ArrowDownRight, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { useToast } from '@/components/ui/Toast'
import {
  createTransactionAction,
  deleteTransactionAction,
  updateTransactionAction,
} from '@/actions/financeActions'
import FileOrLinkUpload from '@/components/ui/FileOrLinkUpload'

interface FinanceClientProps {
  initialTransactions: any[]
  initialInvoices: any[]
}

const CATEGORIES = ['Salary', 'Food', 'Transport', 'Rent', 'Subscription', 'College', 'Personal', 'Entertainment', 'Other']

export default function FinanceClient({
  initialTransactions,
  initialInvoices
}: FinanceClientProps) {
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()

  // States
  const [transactions, setTransactions] = useState<any[]>(initialTransactions)

  // Dialog triggers
  const [showAddTx, setShowAddTx] = useState(false)
  const [editingTx, setEditingTx] = useState<any | null>(null)

  // Form States
  const [txForm, setTxForm] = useState({ type: 'Expense', amount: '', category: 'Food', description: '', source: '', date: new Date().toISOString().split('T')[0], billUrl: '' })
  const [period, setPeriod] = useState<'day' | 'week' | 'month' | 'year'>('month')

  const normalizedTransactions = useMemo(() => {
    return transactions.map((tx) => {
      const dateObj = new Date(tx.date)
      return {
        ...tx,
        amountNum: typeof tx.amount === 'number' ? tx.amount : Number(tx.amount || 0),
        dateObj,
        dateKey: dateObj.toISOString().slice(0, 10),
      }
    })
  }, [transactions])

  const totalIncome = useMemo(
    () => normalizedTransactions.filter((t) => t.type === 'Income').reduce((sum, t) => sum + t.amountNum, 0),
    [normalizedTransactions]
  )

  const totalExpense = useMemo(
    () => normalizedTransactions.filter((t) => t.type === 'Expense').reduce((sum, t) => sum + t.amountNum, 0),
    [normalizedTransactions]
  )

  const netBalance = totalIncome - totalExpense

  const periodTotals = useMemo(() => {
    const now = new Date()
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay())

    let incomes = 0
    let expenses = 0

    normalizedTransactions.forEach((t) => {
      const d = t.dateObj
      let include = false
      if (period === 'day') {
        include = d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
      } else if (period === 'week') {
        include = d >= startOfWeek && d <= now
      } else if (period === 'month') {
        include = d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
      } else if (period === 'year') {
        include = d.getFullYear() === now.getFullYear()
      }

      if (include) {
        if (t.type === 'Income') incomes += t.amountNum
        else expenses += t.amountNum
      }
    })

    return { incomes, expenses, net: incomes - expenses }
  }, [normalizedTransactions, period])

  const groupedByDate = useMemo(() => {
    const groups: { [key: string]: any[] } = {}
    normalizedTransactions.forEach((t) => {
      const key = t.dateKey
      if (!groups[key]) groups[key] = []
      groups[key].push(t)
    })
    const sortedKeys = Object.keys(groups).sort((a, b) => (a < b ? 1 : -1))
    return { groups, sortedKeys }
  }, [normalizedTransactions])

  // 2. Transaction CRUD
  const handleAddTx = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      // If editingTx is set, perform update instead
      if (editingTx) {
        const res = await updateTransactionAction({ id: editingTx._id, ...txForm })
        if (res.success) {
          toast('Transaction updated!', 'success')
          setTransactions((prev) => prev.map((t) => (t._id === res.transaction._id ? res.transaction : t)))
          setEditingTx(null)
          setShowAddTx(false)
          setTxForm({ type: 'Expense', amount: '', category: 'Food', description: '', source: '', date: new Date().toISOString().split('T')[0], billUrl: '' })
        } else {
          toast(res.error || 'Failed to update transaction', 'error')
        }
        return
      }

      const res = await createTransactionAction(txForm)
      if (res.success) {
        toast('Transaction recorded!', 'success')
        setTransactions((prev) => [res.transaction, ...prev])
        setTxForm({ type: 'Expense', amount: '', category: 'Food', description: '', source: '', date: new Date().toISOString().split('T')[0], billUrl: '' })
        setShowAddTx(false)
      } else {
        toast(res.error || 'Failed to log transaction', 'error')
      }
    })
  }

  const handleDeleteTx = (id: string) => {
    startTransition(async () => {
      const res = await deleteTransactionAction(id)
      if (res.success) {
        setTransactions((prev) => prev.filter((t) => t._id !== id))
        toast('Transaction removed.', 'info')
      } else {
        toast(res.error || 'Failed to delete transaction', 'error')
      }
    })
  }

  const handleEditTx = (tx: any) => {
    // Only allow editing within 24 hours of creation
    const createdAt = tx.createdAt ? new Date(tx.createdAt) : new Date(tx.date)
    const now = new Date()
    const msIn24h = 24 * 60 * 60 * 1000
    if (now.getTime() - createdAt.getTime() > msIn24h) {
      toast('Transactions can only be edited within 24 hours of creation.', 'error')
      return
    }

    setEditingTx(tx)
    setTxForm({
      type: tx.type,
      amount: tx.amount,
      category: tx.category,
      description: tx.description || '',
      source: tx.source || '',
      date: new Date(tx.date).toISOString().split('T')[0],
      billUrl: tx.billUrl || '',
    })
    setShowAddTx(true)
  }

  // Invoice functionality removed for budget-focused view

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-white">Budget Manager</h1>
            <p className="text-zinc-500 dark:text-zinc-400 mt-1 text-sm font-medium">Log expenses and earnings, attach bills, and view period analytics</p>
          </div>
          <div className="flex gap-2">
            <div className="flex gap-2">
              <Button onClick={() => { setEditingTx(null); setShowAddTx(true) }} variant="outline" size="sm" className="gap-1.5 h-8.5 cursor-pointer">
                <Plus className="w-4 h-4" /> Add Entry
              </Button>
              <Link href="/dashboard/finance/history">
                <Button variant="ghost" size="sm" className="gap-1.5 h-8.5">
                  History
                </Button>
              </Link>
            </div>
          </div>
        </div>

      {/* Period selector + Cashflow Aggregate widgets cards */}
      <div className="flex items-center gap-3">
        <label className="text-xs font-bold text-zinc-500">View:</label>
        <select value={period} onChange={(e) => setPeriod(e.target.value as any)} className="text-sm rounded-md border border-border bg-background/50 px-2 py-1">
          <option value="day">Today</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="year">This Year</option>
        </select>
        <div className="ml-4 text-sm">
          <span className="font-mono font-bold text-emerald-500">₹{periodTotals.incomes.toLocaleString()}</span>
          <span className="ml-3 font-mono font-bold text-rose-500">-₹{periodTotals.expenses.toLocaleString()}</span>
          <span className="ml-3 font-mono font-bold text-zinc-700">Net: ₹{periodTotals.net.toLocaleString()}</span>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Income Card */}
        <Card className="border-border bg-card/30">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500 tracking-wider">Total Income</p>
              <h3 className="text-3xl font-extrabold font-mono text-emerald-500 mt-2">₹{totalIncome.toLocaleString()}</h3>
            </div>

            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-lg">
              <ArrowUpRight className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        {/* Expenses Card */}
        <Card className="border-border bg-card/30">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500 tracking-wider">Total Expenses</p>
              <h3 className="text-3xl font-extrabold font-mono text-rose-500 mt-2">₹{totalExpense.toLocaleString()}</h3>
            </div>
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-lg">
              <ArrowDownRight className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        {/* Balance Card */}
        <Card className="border-border bg-card/30">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500 tracking-wider">Net Balance</p>
              <h3 className={`text-3xl font-extrabold font-mono mt-2 ${netBalance >= 0 ? 'text-indigo-500' : 'text-rose-500'}`}>
                ₹{netBalance.toLocaleString()}
              </h3>
            </div>
            <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 rounded-lg">
              <Wallet className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grid: Transactions Table & Invoices */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Recent Transactions List */}
        <Card className="border-border bg-card/30">
          <CardHeader className="pb-2 border-b border-border/40">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-zinc-500">Transaction Logs</CardTitle>
            <CardDescription className="text-xs">Direct income and expense entries</CardDescription>
          </CardHeader>
          <CardContent className="py-4 space-y-2 max-h-110 overflow-y-auto pr-1">
            {transactions.length === 0 ? (
              <p className="text-xs text-zinc-500 italic py-8 text-center">No transactions recorded.</p>
            ) : (
              transactions.map((tx) => (
                <div key={tx._id} className="group p-3.5 rounded-lg border border-border bg-card hover:border-zinc-300 dark:hover:border-zinc-700 transition-all flex justify-between items-center gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded ${tx.type === 'Income' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                      {tx.type === 'Income' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                    </div>
                    <div>
                      {tx.type === 'Income' ? (
                        <>
                          <p className="text-sm font-bold text-zinc-950 dark:text-zinc-100">{tx.source || tx.description || 'Income'}</p>
                          <p className="text-[10px] text-zinc-450 font-bold uppercase tracking-wider">Source</p>
                        </>
                      ) : (
                        <>
                          <p className="text-sm font-bold text-zinc-950 dark:text-zinc-150">{tx.description || tx.category}</p>
                          <p className="text-[10px] text-zinc-450 font-bold uppercase tracking-wider">{tx.category}</p>
                        </>
                      )}
                      {tx.billUrl && (
                        <p className="text-[10px] text-zinc-400 mt-1 truncate max-w-xs">
                          <a href={tx.billUrl} target="_blank" rel="noreferrer" className="underline text-violet-600">View receipt</a>
                        </p>
                      )}
                    </div>
                  </div>

                    <div className="flex items-center gap-3.5">
                    <span className={`font-mono text-sm font-bold ${tx.type === 'Income' ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {tx.type === 'Income' ? '+' : '-'}₹{tx.amount}
                    </span>
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleEditTx(tx)} className="opacity-100 md:opacity-0 md:group-hover:opacity-100 p-1 text-zinc-400 hover:text-indigo-500 rounded transition-all">
                        <Plus className="w-4 h-4 rotate-45 transform" />
                      </button>
                      <button 
                        onClick={() => handleDeleteTx(tx._id)}
                        className="opacity-100 md:opacity-0 md:group-hover:opacity-100 p-1 text-zinc-400 hover:text-rose-500 rounded transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
                  )}
                </CardContent>
              </Card>
            </div>

      {/* --- FORMS POPUPS MODALS OVERLAYS --- */}
      
      {/* 1. Add Transaction Modal */}
      <AnimatePresence>
        {showAddTx && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-sm bg-card border border-border rounded-xl p-6 relative">
              <button onClick={() => setShowAddTx(false)} className="absolute right-4 top-4 text-zinc-400 hover:text-zinc-200"><X className="w-5 h-5" /></button>
              <h3 className="text-lg font-bold mb-4">Log Transaction</h3>
              <form onSubmit={handleAddTx} className="space-y-4">
                <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-150 dark:bg-zinc-900 rounded border border-border">
                  <button 
                    type="button" 
                    onClick={() => setTxForm((prev) => ({ ...prev, type: 'Expense' }))}
                    className={`py-1.5 text-xs font-bold rounded transition-all cursor-pointer ${txForm.type === 'Expense' ? 'bg-indigo-500 text-white shadow-sm' : 'text-zinc-500'}`}
                  >
                    Expense
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setTxForm((prev) => ({ ...prev, type: 'Income' }))}
                    className={`py-1.5 text-xs font-bold rounded transition-all cursor-pointer ${txForm.type === 'Income' ? 'bg-indigo-500 text-white shadow-sm' : 'text-zinc-500'}`}
                  >
                    Income
                  </button>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="txAmount">Amount (INR)</Label>
                  <Input id="txAmount" type="number" min="0.01" step="0.01" placeholder="e.g. 500" value={txForm.amount} onChange={(e) => setTxForm((prev) => ({ ...prev, amount: e.target.value }))} required />
                </div>
                
                {txForm.type === 'Expense' ? (
                  <>
                    <div className="space-y-1">
                      <Label htmlFor="txCat">Category</Label>
                      <select id="txCat" value={txForm.category} onChange={(e) => setTxForm((prev) => ({ ...prev, category: e.target.value }))} required className="flex h-10 w-full rounded-md border border-border bg-background/70 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-50 outline-none focus-visible:ring-2 focus-visible:ring-ring">
                        {CATEGORIES.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="txDesc">Description</Label>
                      <Input id="txDesc" type="text" placeholder="Details..." value={txForm.description} onChange={(e) => setTxForm((prev) => ({ ...prev, description: e.target.value }))} />
                    </div>
                  </>
                ) : (
                  <div className="space-y-1">
                    <Label htmlFor="txSource">Source</Label>
                    <Input id="txSource" type="text" placeholder="e.g. Salary, Bank" value={txForm.source} onChange={(e) => setTxForm((prev) => ({ ...prev, source: e.target.value }))} required />
                  </div>
                )}

                <div className="space-y-1">
                  <FileOrLinkUpload
                    value={txForm.billUrl}
                    onUploadComplete={(url: string) => setTxForm((prev) => ({ ...prev, billUrl: url }))}
                    label="Attach bill (file or URL)"
                    accept="image/*,application/pdf"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="txDate">Transaction Date</Label>
                  <Input id="txDate" type="date" value={txForm.date} onChange={(e) => setTxForm((prev) => ({ ...prev, date: e.target.value }))} required />
                </div>

                <Button type="submit" variant="primary" className="w-full" isLoading={isPending}>Save Transaction</Button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Invoice features removed; budget-focused UI only */}

    </div>
  )
}
