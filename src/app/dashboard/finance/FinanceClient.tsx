'use client'

import React, { useState, useTransition, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Plus, 
  Trash2, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight, 
  IndianRupee, 
  DollarSign, 
  CreditCard, 
  X, 
  AlertCircle, 
  Check, 
  Mail,
  Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { useToast } from '@/components/ui/Toast'
import { 
  createTransactionAction, 
  deleteTransactionAction, 
  createInvoiceAction, 
  deleteInvoiceAction,
  markInvoicePaidAction 
} from '@/actions/financeActions'

interface FinanceClientProps {
  initialTransactions: any[]
  initialInvoices: any[]
}

const CATEGORIES = ['Freelancing', 'Salary', 'Food', 'Transport', 'Rent', 'Subscription', 'College', 'Personal', 'Entertainment']

export default function FinanceClient({
  initialTransactions,
  initialInvoices
}: FinanceClientProps) {
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()

  // States
  const [transactions, setTransactions] = useState<any[]>(initialTransactions)
  const [invoices, setInvoices] = useState<any[]>(initialInvoices)

  // Dialog triggers
  const [showAddTx, setShowAddTx] = useState(false)
  const [showAddInvoice, setShowAddInvoice] = useState(false)
  const [selectedInvoiceForMock, setSelectedInvoiceForMock] = useState<any | null>(null)

  // Form States
  const [txForm, setTxForm] = useState({ type: 'Expense', amount: '', category: 'Food', description: '', date: new Date().toISOString().split('T')[0] })
  const [invoiceForm, setInvoiceForm] = useState({ clientName: '', clientEmail: '', amount: '', description: '' })

  // Razorpay Checkout Action
  const [checkoutLoading, setCheckoutLoading] = useState(false)

  // 1. Calculate Aggregate Totals
  const totalIncome = transactions.filter((t) => t.type === 'Income').reduce((sum, t) => sum + t.amount, 0)
  const totalExpense = transactions.filter((t) => t.type === 'Expense').reduce((sum, t) => sum + t.amount, 0)
  const netBalance = totalIncome - totalExpense

  // 2. Transaction CRUD
  const handleAddTx = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const res = await createTransactionAction(txForm)
      if (res.success) {
        toast('Transaction recorded!', 'success')
        setTransactions((prev) => [res.transaction, ...prev])
        setTxForm({ type: 'Expense', amount: '', category: 'Food', description: '', date: new Date().toISOString().split('T')[0] })
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

  // 3. Invoice CRUD
  const handleAddInvoice = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const res = await createInvoiceAction(invoiceForm)
      if (res.success) {
        toast('Invoice generated!', 'success')
        setInvoices((prev) => [res.invoice, ...prev])
        setInvoiceForm({ clientName: '', clientEmail: '', amount: '', description: '' })
        setShowAddInvoice(false)
      } else {
        toast(res.error || 'Failed to generate invoice', 'error')
      }
    })
  }

  const handleDeleteInvoice = (id: string) => {
    startTransition(async () => {
      const res = await deleteInvoiceAction(id)
      if (res.success) {
        setInvoices((prev) => prev.filter((inv) => inv._id !== id))
        toast('Invoice removed.', 'info')
      } else {
        toast(res.error || 'Failed to delete invoice', 'error')
      }
    })
  }

  // --- RAZORPAY CHECKOUT OR MOCK ---
  const handlePayInvoice = async (invoice: any) => {
    setCheckoutLoading(true)
    try {
      const orderRes = await fetch('/api/payment/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId: invoice._id })
      })

      if (!orderRes.ok) throw new Error('Order creation failed.')
      const orderData = await orderRes.json()

      // If keys are missing, trigger simulation modal popup
      if (orderData.mock) {
        setSelectedInvoiceForMock(invoice)
        setCheckoutLoading(false)
        return
      }

      // Dynamically load Razorpay SDK script
      const script = document.createElement('script')
      script.src = 'https://checkout.razorpay.com/v1/checkout.js'
      script.async = true
      script.onload = () => {
        const options = {
          key: orderData.key,
          amount: orderData.amount,
          currency: orderData.currency,
          name: 'Solo Leveling Dashboard',
          description: `Freelance Payment: ${invoice.description}`,
          order_id: orderData.id,
          handler: async function (response: any) {
            setCheckoutLoading(true)
            try {
              const verifyRes = await fetch('/api/payment/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  invoiceId: invoice._id
                })
              })
              
              if (verifyRes.ok) {
                toast('Invoice Paid successfully!', 'success')
                setInvoices((prev) => prev.map((inv) => inv._id === invoice._id ? { ...inv, status: 'Paid' } : inv))
                // Reload transactions to reflect new income
                const txRes = await fetch('/api/user/profile') // Refresh indicator
                window.location.reload()
              } else {
                toast('Payment verification failed.', 'error')
              }
            } catch (err) {
              toast('Verification error.', 'error')
            } finally {
              setCheckoutLoading(false)
            }
          },
          prefill: {
            name: invoice.clientName,
            email: invoice.clientEmail
          },
          theme: {
            color: '#6366f1' // indigo-500
          }
        }

        const rzp = new (window as any).Razorpay(options)
        rzp.open()
      }
      document.body.appendChild(script)

    } catch (err) {
      console.error(err)
      toast('Failed to initialize payment gateway.', 'error')
    } finally {
      setCheckoutLoading(false)
    }
  }

  // Handle Mock verification simulation
  const handleSimulateMockPayment = () => {
    if (!selectedInvoiceForMock) return

    startTransition(async () => {
      const res = await markInvoicePaidAction(selectedInvoiceForMock._id)
      if (res.success) {
        toast(res.message || 'Mock Invoice Paid! +50 XP rewarded', 'success')
        setInvoices((prev) => prev.map((inv) => inv._id === selectedInvoiceForMock._id ? { ...inv, status: 'Paid' } : inv))
        
        // Add transaction income locally
        const newIncome = {
          _id: `mock-tx-${Date.now()}`,
          type: 'Income',
          amount: selectedInvoiceForMock.amount,
          category: 'Freelancing',
          description: `Payment for invoice: ${selectedInvoiceForMock.description}`,
          date: new Date()
        }
        setTransactions((prev) => [newIncome, ...prev])
        setSelectedInvoiceForMock(null)
      } else {
        toast(res.error || 'Mock payment simulation failed', 'error')
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-white">Finance Manager</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1 text-sm font-medium">Track operational transactions and compile freelance invoices</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowAddTx(true)} variant="outline" size="sm" className="gap-1.5 h-8.5 cursor-pointer">
            <Plus className="w-4 h-4" /> Add Transaction
          </Button>
          <Button onClick={() => setShowAddInvoice(true)} variant="outline" size="sm" className="gap-1.5 h-8.5 cursor-pointer">
            <Plus className="w-4 h-4" /> Create Invoice
          </Button>
        </div>
      </div>

      {/* Cashflow Aggregate widgets cards */}
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
          <CardContent className="py-4 space-y-2 max-h-[440px] overflow-y-auto pr-1">
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
                      <p className="text-sm font-bold text-zinc-950 dark:text-zinc-150">{tx.description || tx.category}</p>
                      <p className="text-[10px] text-zinc-450 font-bold uppercase tracking-wider">{tx.category}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3.5">
                    <span className={`font-mono text-sm font-bold ${tx.type === 'Income' ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {tx.type === 'Income' ? '+' : '-'}₹{tx.amount}
                    </span>
                    <button 
                      onClick={() => handleDeleteTx(tx._id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-rose-500 rounded transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Client Invoices List */}
        <Card className="border-border bg-card/30">
          <CardHeader className="pb-2 border-b border-border/40">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-zinc-500">Client Invoices</CardTitle>
            <CardDescription className="text-xs">Freelance bills and payment links</CardDescription>
          </CardHeader>
          <CardContent className="py-4 space-y-2 max-h-[440px] overflow-y-auto pr-1">
            {invoices.length === 0 ? (
              <p className="text-xs text-zinc-500 italic py-8 text-center">No invoices generated.</p>
            ) : (
              invoices.map((inv) => (
                <div key={inv._id} className="p-4 rounded-lg border border-border bg-card space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-sm text-zinc-950 dark:text-white">{inv.clientName}</h4>
                      <p className="text-[10px] text-zinc-400 font-bold flex items-center gap-1">
                        <Mail className="w-3 h-3" /> {inv.clientEmail}
                      </p>
                    </div>

                    <span className={`text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                      inv.status === 'Paid'
                        ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-500 border border-amber-500/20 animate-pulse'
                    }`}>
                      {inv.status}
                    </span>
                  </div>

                  <p className="text-xs text-zinc-500 dark:text-zinc-400 bg-zinc-50/50 dark:bg-zinc-900/50 p-2.5 rounded border border-border/45">
                    {inv.description}
                  </p>

                  <div className="flex justify-between items-center border-t border-border/40 pt-2.5">
                    <span className="font-mono text-sm font-bold text-indigo-500">₹{inv.amount}</span>
                    
                    <div className="flex gap-2">
                      {inv.status === 'Unpaid' && (
                        <Button 
                          onClick={() => handlePayInvoice(inv)}
                          disabled={checkoutLoading}
                          variant="primary" 
                          size="sm" 
                          className="h-8 text-xs cursor-pointer gap-1 shadow-sm"
                        >
                          {checkoutLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CreditCard className="w-3.5 h-3.5" />}
                          Pay Invoice
                        </Button>
                      )}
                      
                      <Button 
                        onClick={() => handleDeleteInvoice(inv._id)}
                        variant="ghost" 
                        size="sm" 
                        className="h-8 text-rose-500 hover:bg-rose-500/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
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

      {/* 2. Add Invoice Modal */}
      <AnimatePresence>
        {showAddInvoice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-md bg-card border border-border rounded-xl p-6 relative">
              <button onClick={() => setShowAddInvoice(false)} className="absolute right-4 top-4 text-zinc-400 hover:text-zinc-200"><X className="w-5 h-5" /></button>
              <h3 className="text-lg font-bold mb-4 font-sans">Generate Client Invoice</h3>
              <form onSubmit={handleAddInvoice} className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="invClient">Client Name</Label>
                  <Input id="invClient" type="text" placeholder="e.g. Acme Corp" value={invoiceForm.clientName} onChange={(e) => setInvoiceForm((prev) => ({ ...prev, clientName: e.target.value }))} required />
                </div>
                
                <div className="space-y-1">
                  <Label htmlFor="invEmail">Client Email</Label>
                  <Input id="invEmail" type="email" placeholder="client@company.com" value={invoiceForm.clientEmail} onChange={(e) => setInvoiceForm((prev) => ({ ...prev, clientEmail: e.target.value }))} required />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="invAmount">Billing Amount (INR)</Label>
                  <Input id="invAmount" type="number" min="1" placeholder="e.g. 15000" value={invoiceForm.amount} onChange={(e) => setInvoiceForm((prev) => ({ ...prev, amount: e.target.value }))} required />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="invDesc">Billing Scope / Description</Label>
                  <textarea id="invDesc" placeholder="e.g. Landing Page Design & SEO Optimization" value={invoiceForm.description} onChange={(e) => setInvoiceForm((prev) => ({ ...prev, description: e.target.value }))} className="flex w-full rounded-md border border-border bg-background/50 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-50 outline-none focus-visible:ring-2 focus-visible:ring-ring" rows={3} required />
                </div>

                <Button type="submit" variant="primary" className="w-full" isLoading={isPending}>Generate Invoice</Button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 3. Razorpay Simulation Modal for Mock Payments */}
      <AnimatePresence>
        {selectedInvoiceForMock && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-sm bg-card border border-border rounded-xl p-6 relative">
              <button onClick={() => setSelectedInvoiceForMock(null)} className="absolute right-4 top-4 text-zinc-400 hover:text-zinc-200"><X className="w-5 h-5" /></button>
              <div className="text-center space-y-4">
                <div className="p-3 bg-amber-500/10 text-amber-500 rounded-full w-fit mx-auto border border-amber-500/20">
                  <AlertCircle className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold">Razorpay Test Sandbox</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Razorpay credentials are not set up in your <code>.env.local</code>. Click below to simulate checkout verification and reward <strong>+50 XP</strong>.
                </p>

                <div className="bg-zinc-50/50 dark:bg-zinc-950/20 p-3 rounded-lg border border-border text-left space-y-1 text-xs">
                  <p><strong>Client:</strong> {selectedInvoiceForMock.clientName}</p>
                  <p><strong>Billing:</strong> ₹{selectedInvoiceForMock.amount}</p>
                  <p><strong>Scope:</strong> {selectedInvoiceForMock.description}</p>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button 
                    type="button" 
                    variant="ghost" 
                    className="flex-1 text-xs" 
                    onClick={() => setSelectedInvoiceForMock(null)}
                  >
                    Cancel
                  </Button>
                  
                  <Button 
                    type="button" 
                    variant="primary" 
                    className="flex-1 text-xs" 
                    onClick={handleSimulateMockPayment}
                    isLoading={isPending}
                  >
                    Simulate Payment
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  )
}
