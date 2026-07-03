'use client'

import React, { createContext, useContext, useState, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X, CheckCircle2, AlertTriangle, Info, XCircle } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info' | 'warning'

interface Toast {
  id: string
  message: string
  type: ToastType
  duration?: number
}

interface ToastContextType {
  toast: (message: string, type?: ToastType, duration?: number) => void
  toasts: Toast[]
  removeToast: (id: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback((message: string, type: ToastType = 'info', duration = 4000) => {
    const id = Math.random().toString(36).substring(2, 9)
    setToasts((prev) => [...prev, { id, message, type, duration }])

    setTimeout(() => {
      removeToast(id)
    }, duration)
  }, [removeToast])

  return (
    <ToastContext.Provider value={{ toast, toasts, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

function ToastContainer({ toasts, removeToast }: { toasts: Toast[]; removeToast: (id: string) => void }) {
  return (
    <div
      className="fixed inset-x-4 bottom-4 z-50 flex flex-col gap-2 sm:left-auto sm:right-4 sm:w-full sm:max-w-sm"
      role="region"
      aria-label="Notifications"
    >
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            role="status"
            aria-live={t.type === 'error' ? 'assertive' : 'polite'}
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.2 } }}
            className={`flex items-start gap-3 p-4 rounded-lg shadow-lg border backdrop-blur-md ${
              t.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                : t.type === 'error'
                ? 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'
                : t.type === 'warning'
                ? 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400'
                : 'bg-zinc-500/10 border-zinc-500/20 text-zinc-600 dark:text-zinc-400'
            }`}
          >
            <div className="mt-0.5">
              {t.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
              {t.type === 'error' && <XCircle className="w-5 h-5 text-rose-500" />}
              {t.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-500" />}
              {t.type === 'info' && <Info className="w-5 h-5 text-zinc-500" />}
            </div>
            <div className="flex-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">{t.message}</div>
            <button
              onClick={() => removeToast(t.id)}
              className="min-h-11 min-w-11 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
