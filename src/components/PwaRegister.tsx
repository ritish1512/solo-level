'use client'

import { useEffect } from 'react'

export default function PwaRegister() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      const handleLoad = () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((reg) => {
            console.log('Service Worker registered successfully with scope:', reg.scope)
          })
          .catch((err) => {
            console.error('Service Worker registration failed:', err)
          })
      }

      // Check if document has loaded
      if (document.readyState === 'complete') {
        handleLoad()
      } else {
        window.addEventListener('load', handleLoad)
        return () => window.removeEventListener('load', handleLoad)
      }
    }
  }, [])

  return null
}
