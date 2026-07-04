import React from 'react'

export default function Loading() {
  return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-b from-transparent to-black/40 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 animate-fade-in-up">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-1 shadow-lg">
              <div className="w-full h-full rounded-full bg-background flex items-center justify-center">
                <svg className="w-10 h-10 text-white animate-spin" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.12" strokeWidth="4" />
                  <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                </svg>
              </div>
            </div>

            <div className="text-center">
              <h3 className="text-lg font-semibold">Loading</h3>
              <p className="text-sm text-muted">Preparing your dashboard…</p>
            </div>

            <div className="w-48 h-2 rounded-full overflow-hidden bg-muted/20">
              <div className="h-full bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 loader-shimmer" />
            </div>
          </div>
        </div>
  )
}
