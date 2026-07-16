'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { WifiOff, RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react'
import { getQueue } from '@/lib/offlineDb'
import { syncOfflineQueue } from '@/lib/offlineSync'
import { motion, AnimatePresence } from 'framer-motion'

export default function OfflineSyncBanner() {
  const [isOnline, setIsOnline] = useState(true)
  const [queueCount, setQueueCount] = useState(0)
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle')
  const [visible, setVisible] = useState(false)

  const updateQueueCount = useCallback(async () => {
    const queue = await getQueue()
    setQueueCount(queue.length)
  }, [])

  const handleSync = useCallback(async () => {
    if (syncStatus === 'syncing') return
    setSyncStatus('syncing')
    setVisible(true)

    try {
      const { failed } = await syncOfflineQueue(() => {
        void updateQueueCount()
      })

      if (failed > 0) {
        setSyncStatus('error')
        setTimeout(() => setVisible(false), 5000)
      } else {
        setSyncStatus('success')
        setQueueCount(0)
        setTimeout(() => setVisible(false), 3000)
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('offline-sync-complete'))
          window.location.reload()
        }
      }
    } catch (err) {
      console.error('Offline sync execution failed:', err)
      setSyncStatus('error')
      setTimeout(() => setVisible(false), 5000)
    }
  }, [syncStatus, updateQueueCount])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const initialize = async () => {
      const online = navigator.onLine
      setIsOnline(online)
      setVisible(!online)
      await updateQueueCount()
    }

    void initialize()

    const handleOnline = async () => {
      setIsOnline(true)
      await updateQueueCount()

      const queue = await getQueue()
      if (queue.length > 0) {
        void handleSync()
      } else {
        setSyncStatus('success')
        setVisible(true)
        setTimeout(() => setVisible(false), 3000)
      }
    }

    const handleOffline = () => {
      setIsOnline(false)
      setSyncStatus('idle')
      setVisible(true)
    }

    const handleActionQueued = async () => {
      await updateQueueCount()
      setVisible(true)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    window.addEventListener('offline-action-queued', handleActionQueued)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('offline-action-queued', handleActionQueued)
    }
  }, [handleSync, updateQueueCount])

  if (!visible && queueCount === 0) return null

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          className="fixed bottom-6 right-6 z-50 max-w-sm rounded-xl border border-zinc-200/50 bg-white/70 p-4 shadow-xl backdrop-blur-md dark:border-zinc-800/50 dark:bg-zinc-950/70"
        >
          <div className="flex items-start gap-3">
            {!isOnline ? (
              <WifiOff className="mt-0.5 h-5 w-5 text-amber-500 animate-pulse" />
            ) : syncStatus === 'syncing' ? (
              <RefreshCw className="mt-0.5 h-5 w-5 text-indigo-500 animate-spin" />
            ) : syncStatus === 'success' ? (
              <CheckCircle className="mt-0.5 h-5 w-5 text-emerald-500" />
            ) : (
              <AlertTriangle className="mt-0.5 h-5 w-5 text-rose-500" />
            )}

            <div className="flex-1 space-y-1">
              <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                {!isOnline
                  ? 'Offline Mode Active'
                  : syncStatus === 'syncing'
                  ? 'Syncing Offline Changes'
                  : syncStatus === 'success'
                  ? 'Synchronization Complete'
                  : 'Syncing Failed'}
              </h4>
              <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                {!isOnline
                  ? `You are working offline. ${
                      queueCount > 0 ? `${queueCount} changes` : 'No changes'
                    } queued to sync when you reconnect.`
                  : syncStatus === 'syncing'
                  ? `Processing ${queueCount} queued updates...`
                  : syncStatus === 'success'
                  ? 'All local offline changes are now synchronized with the server!'
                  : 'Some offline edits failed to sync. Click retry to run them again.'}
              </p>

              {isOnline && queueCount > 0 && syncStatus !== 'syncing' && (
                <button
                  onClick={handleSync}
                  className="mt-2 flex items-center gap-1 rounded bg-indigo-500 px-2 py-1 text-[10px] font-bold text-white transition-colors hover:bg-indigo-600 shadow"
                >
                  <RefreshCw className="h-3 w-3" /> Sync Now ({queueCount})
                </button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
