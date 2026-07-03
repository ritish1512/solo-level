'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/components/providers'

export function ThemeToggleButton() {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      onClick={toggleTheme}
      className="min-h-11 min-w-11 rounded-lg border border-zinc-200 bg-white p-2 shadow-sm transition-all hover:bg-zinc-100 dark:border-border dark:bg-card/50 dark:hover:bg-zinc-800"
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4 text-zinc-700" />}
    </button>
  )
}
