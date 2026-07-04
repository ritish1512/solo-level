'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function InstallButton() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [show, setShow] = useState(false)

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setPromptEvent(event as BeforeInstallPromptEvent)
      setShow(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
  }, [])

  const handleInstall = async () => {
    if (!promptEvent) return

    await promptEvent.prompt()
    await promptEvent.userChoice
    setShow(false)
    setPromptEvent(null)
  }

  if (!show) {
    return null
  }

  return (
    <Button onClick={handleInstall} variant="secondary" size="lg" className="w-full sm:w-auto">
      ⚡ Install Solo Leveling
    </Button>
  )
}
