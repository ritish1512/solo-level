'use client'

import { useEffect } from 'react'

export default function PwaRegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

    const registerServiceWorker = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
        console.log('Service Worker registered successfully with scope:', registration.scope)

        if (registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' })
        }

        registration.addEventListener('updatefound', () => {
          const installingWorker = registration.installing
          if (!installingWorker) return

          installingWorker.addEventListener('statechange', () => {
            if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
              window.location.reload()
            }
          })
        })
      } catch (err) {
        console.error('Service Worker registration failed:', err)
      }
    }

    if (document.readyState === 'complete') {
      void registerServiceWorker()
    } else {
      window.addEventListener('load', registerServiceWorker)
      return () => window.removeEventListener('load', registerServiceWorker)
    }
  }, [])

  return null
}
