'use client'

import { useEffect, useState } from 'react'
import { ArrowRight, BookOpen, CheckCircle2, Sparkles, X } from 'lucide-react'

const STORAGE_KEY = 'solo-leveling-tutorial-seen'

const steps = [
  {
    title: 'Start with one small win',
    description: 'Open the dashboard and add one task or habit. Small steps build momentum faster than big plans.',
  },
  {
    title: 'Keep your day focused',
    description: 'Use the pomodoro timer and daily score to stay steady without feeling overwhelmed.',
  },
  {
    title: 'Let reminders help you',
    description: 'Turn on reminders for habits, classes, and deadlines so nothing slips through the cracks.',
  },
]

interface TutorialGuideProps {
  autoShow?: boolean
  buttonLabel?: string
  buttonClassName?: string
}

export default function TutorialGuide({ autoShow = false, buttonLabel = 'Open tutorial', buttonClassName = '' }: TutorialGuideProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeStep, setActiveStep] = useState(0)

  useEffect(() => {
    if (!autoShow || typeof window === 'undefined') return

    const hasSeenTutorial = window.localStorage.getItem(STORAGE_KEY) === 'true'
    if (!hasSeenTutorial) {
      setIsOpen(true)
    }
  }, [autoShow])

  const openGuide = () => {
    setActiveStep(0)
    setIsOpen(true)
  }

  const closeGuide = () => {
    setIsOpen(false)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, 'true')
    }
  }

  const nextStep = () => {
    setActiveStep((prev) => (prev + 1) % steps.length)
  }

  const previousStep = () => {
    setActiveStep((prev) => (prev - 1 + steps.length) % steps.length)
  }

  return (
    <>
      <button
        type="button"
        onClick={openGuide}
        className={`inline-flex items-center gap-2 rounded-full border border-indigo-300/70 bg-white/90 px-3.5 py-2 text-sm font-semibold text-indigo-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-indigo-50 dark:border-indigo-500/30 dark:bg-zinc-900/90 dark:text-indigo-300 ${buttonClassName} animate-pulse`.trim()}
      >
        <BookOpen className="h-4 w-4" />
        {buttonLabel}
      </button>

      {isOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-slate-950/70 px-4 py-6 backdrop-blur-sm z-99">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-background p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-indigo-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">
                  <Sparkles className="h-3.5 w-3.5" />
                  Quick guide
                </p>
                <h2 className="text-xl font-bold text-foreground">A simple way to get started</h2>
              </div>
              <button
                type="button"
                onClick={closeGuide}
                className="rounded-full p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                aria-label="Close tutorial"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-6 rounded-xl border border-border bg-card/80 p-4">
              <div className="mb-4 flex items-center gap-2">
                {steps.map((_, index) => (
                  <span
                    key={index}
                    className={`h-2.5 w-2.5 rounded-full ${index === activeStep ? 'bg-indigo-600 dark:bg-indigo-400' : 'bg-zinc-300 dark:bg-zinc-700'}`}
                  />
                ))}
              </div>
              <h3 className="text-lg font-semibold text-foreground">{steps[activeStep].title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{steps[activeStep].description}</p>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm text-muted-foreground">
                Step {activeStep + 1} of {steps.length}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={previousStep}
                  className="rounded-full border border-border px-3 py-2 text-sm font-semibold text-foreground transition hover:bg-muted"
                >
                  Back
                </button>
                {activeStep === steps.length - 1 ? (
                  <button
                    type="button"
                    onClick={closeGuide}
                    className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Got it
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={nextStep}
                    className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
                  >
                    Next
                    <ArrowRight className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      ) }
    </>
  )
}
