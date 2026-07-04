'use client'

import React, { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

export default function LoadingOverlay() {
  const pathname = usePathname()
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // When pathname changes, show the overlay briefly to improve perceived performance
    let mounted = true
    setLoading(true)
    const t = setTimeout(() => {
      if (mounted) setLoading(false)
    }, 500)
    return () => {
      mounted = false
      clearTimeout(t)
    }
  }, [pathname])

  if (!loading) return null

  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3 bg-background/90 p-4 rounded-lg shadow-lg backdrop-blur-sm">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-1">
          <div className="w-full h-full rounded-full bg-background flex items-center justify-center">
            <svg className="w-6 h-6 text-white animate-spin" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.12" strokeWidth="3" />
              <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </div>
        </div>
        <div className="text-sm font-medium">Loading…</div>
      </div>
    </div>
  )
}
