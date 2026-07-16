'use client'

import Link from 'next/link'

import React, { useState, useEffect, useTransition, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Plus, 
  Check, 
  Trash2, 
  Clock, 
  Award, 
  Calendar, 
  Flame, 
  AlertCircle, 
  ChevronRight,
  PlusSquare,
  Timer,
  Pencil
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import TutorialGuide from '@/components/TutorialGuide'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { useToast } from '@/components/ui/Toast'
import { ReminderConfigPanel } from '@/components/ui/ReminderConfigPanel'
import { getHabitsAction, toggleHabitDateAction } from '@/actions/habitActions'
import { getHabitRecurrenceLabel, isHabitDueForDate, formatLocalDate } from '@/lib/habitRecurrence'
import { updateTaskStatusAction } from '@/actions/taskActions'
import { 
  createTimeBlockAction, 
  updateTimeBlockAction, 
  deleteTimeBlockAction 
} from '@/actions/plannerActions'

interface DashboardProps {
  initialUserProfile: any
  initialTasks: any[]
  initialHabits: any[]
  initialTimeBlocks: any[]
}

const QUOTES = [
  "No matter how hard it gets, remember why you started.",
  "Consistency is the difference between a shadow and a monarch.",
  "Focus on execution. Let consistency build your kingdom.",
  "Every task completed is another level cleared.",
  "Yesterday you said tomorrow. Today, you arise.",
  "The only way to get stronger is to keep fighting."
]

type DashboardWidgetKey = 'dailyScore' | 'pomodoro' | 'schedule'

const DEFAULT_WIDGET_VISIBILITY: Record<DashboardWidgetKey, boolean> = {
  dailyScore: true,
  pomodoro: true,
  schedule: true,
}

const DASHBOARD_WIDGET_STORAGE_KEY = 'solo-leveling-dashboard-widgets'

export default function DashboardClient({
  initialUserProfile,
  initialTasks,
  initialHabits,
  initialTimeBlocks,
}: DashboardProps) {
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()
  
  // Real-time states
  const [currentTime, setCurrentTime] = useState('')
  const [currentDate, setCurrentDate] = useState('')
  const [quote, setQuote] = useState('')
  const [showWidgetEditor, setShowWidgetEditor] = useState(false)
  const [widgetVisibility, setWidgetVisibility] = useState<Record<DashboardWidgetKey, boolean>>(DEFAULT_WIDGET_VISIBILITY)

  useEffect(() => {
    const updateClock = () => {
      const now = new Date()
      setCurrentTime(
        now.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      )
      setCurrentDate(
        now.toLocaleDateString([], {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
        })
      )
    }

    updateClock()
    const intervalId = window.setInterval(updateClock, 1000)
    return () => window.clearInterval(intervalId)
  }, [])

  useEffect(() => {
    const randomQuote = QUOTES[Math.floor(Math.random() * QUOTES.length)]
    setQuote(randomQuote)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      const stored = window.localStorage.getItem(DASHBOARD_WIDGET_STORAGE_KEY)
      if (!stored) return

      const parsed = JSON.parse(stored) as Partial<Record<DashboardWidgetKey, boolean>>
      setWidgetVisibility({
        ...DEFAULT_WIDGET_VISIBILITY,
        ...parsed,
      })
    } catch (error) {
      console.error('Failed to restore dashboard widget visibility:', error)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(DASHBOARD_WIDGET_STORAGE_KEY, JSON.stringify(widgetVisibility))
  }, [widgetVisibility])

  const toggleWidgetVisibility = (key: DashboardWidgetKey) => {
    setWidgetVisibility((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  // Data states
  const [userProfile, setUserProfile] = useState(initialUserProfile)
  const [tasks, setTasks] = useState(initialTasks)
  const [habits, setHabits] = useState(initialHabits)
  const [timeBlocks, setTimeBlocks] = useState(initialTimeBlocks)

  // Caching dashboard states in IndexedDB for offline reliability
  useEffect(() => {
    async function loadCache() {
      try {
        const { getFromStore, saveToStore } = await import('@/lib/offlineDb')
        const cachedTasks = await getFromStore('cache_store', 'tasks')
        if (cachedTasks && Array.isArray(cachedTasks)) setTasks(cachedTasks)
        else await saveToStore('cache_store', 'tasks', initialTasks)

        const cachedHabits = await getFromStore('cache_store', 'habits')
        if (cachedHabits && Array.isArray(cachedHabits)) setHabits(cachedHabits)
        else await saveToStore('cache_store', 'habits', initialHabits)

        const cachedTimeBlocks = await getFromStore('cache_store', 'timeBlocks')
        if (cachedTimeBlocks && Array.isArray(cachedTimeBlocks)) setTimeBlocks(cachedTimeBlocks)
        else await saveToStore('cache_store', 'timeBlocks', initialTimeBlocks)

        const cachedProfile = await getFromStore('cache_store', 'profile')
        if (cachedProfile) setUserProfile(cachedProfile)
        else await saveToStore('cache_store', 'profile', initialUserProfile)
      } catch (err) {
        console.error('Failed to load dashboard caches:', err)
      }
    }
    void loadCache()
  }, [initialTasks, initialHabits, initialTimeBlocks, initialUserProfile])

  useEffect(() => {
    async function saveTasks() {
      const { saveToStore } = await import('@/lib/offlineDb')
      await saveToStore('cache_store', 'tasks', tasks)
    }
    void saveTasks()
  }, [tasks])

  useEffect(() => {
    async function saveHabits() {
      const { saveToStore } = await import('@/lib/offlineDb')
      await saveToStore('cache_store', 'habits', habits)
    }
    void saveHabits()
  }, [habits])

  useEffect(() => {
    async function saveTimeBlocks() {
      const { saveToStore } = await import('@/lib/offlineDb')
      await saveToStore('cache_store', 'timeBlocks', timeBlocks)
    }
    void saveTimeBlocks()
  }, [timeBlocks])

  useEffect(() => {
    async function saveProfile() {
      const { saveToStore } = await import('@/lib/offlineDb')
      await saveToStore('cache_store', 'profile', userProfile)
    }
    void saveProfile()
  }, [userProfile])

  const POMODORO_STORAGE_KEY = 'solo-leveling-pomodoro'

  // Pomodoro Timer states
  const [pomodoroMode, setPomodoroMode] = useState(25) // 25 mins
  const [timeLeft, setTimeLeft] = useState(25 * 60)
  const [timerDuration, setTimerDuration] = useState(25 * 60)
  const [timerStartTimestamp, setTimerStartTimestamp] = useState<number | null>(null)
  const [timerRunning, setTimerRunning] = useState(false)
  const [timerProgress, setTimerProgress] = useState(100)
  const [customMinutes, setCustomMinutes] = useState('25')
  const [timerInfo, setTimerInfo] = useState('')
  const [startAudioUrl, setStartAudioUrl] = useState<string | null>(null)
  const [completionAudioUrl, setCompletionAudioUrl] = useState<string | null>(null)
  const [sessionFinished, setSessionFinished] = useState(false)
  const startAudioRef = useRef<HTMLAudioElement | null>(null)
  const completionAudioRef = useRef<HTMLAudioElement | null>(null)
  const wakeLockSentinelRef = useRef<WakeLockSentinel | null>(null)
  const completionHandledRef = useRef(false)
  const completionPhaseRef = useRef(false)
  const activeAudioPhaseRef = useRef<'idle' | 'start' | 'completion'>('idle')
  const activeStartAudioUrlRef = useRef<string | null>(null)
  const activeCompletionAudioUrlRef = useRef<string | null>(null)

  // New Time Block form
  const [showAddBlock, setShowAddBlock] = useState(false)
  const [newBlock, setNewBlock] = useState({
    title: '',
    startTime: '08:00',
    endTime: '09:00',
    reminderConfigs: [] as any[],
  })

  // Date String YYYY-MM-DD (local date)
  const todayStr = formatLocalDate(new Date())

  // Synthesize beep audio using Web Audio API (no assets needed)
  const playBeep = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
      const audioCtx = new AudioContextClass()
      if (audioCtx.state === 'suspended') {
        void audioCtx.resume()
      }
      const oscillator = audioCtx.createOscillator()
      const gainNode = audioCtx.createGain()

      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(800, audioCtx.currentTime) // 800 Hz beep
      gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime)

      oscillator.connect(gainNode)
      gainNode.connect(audioCtx.destination)

      oscillator.start()
      oscillator.stop(audioCtx.currentTime + 0.3) // 0.3 seconds beep
    } catch (e) {
      console.log('Audio Context error:', e)
    }
  }

  const loadLocalAudio = async (file: File) => {
    return URL.createObjectURL(file)
  }

  const pauseAudio = (audio: HTMLAudioElement | null) => {
    if (!audio) return
    try {
      audio.muted = true
      audio.pause()
      if (audio.readyState > 0) {
        audio.currentTime = 0
      }
    } catch (e) {
      console.log('Error pausing audio:', e)
    }
  }

  const tryPlayAudio = async (audio: HTMLAudioElement | null) => {
    if (!audio) return
    try {
      audio.pause()
      audio.currentTime = 0
      audio.muted = false
      await audio.play()
    } catch (e) {
      console.log('Audio playback blocked:', e)
    }
  }

  const stopAllTimerAudio = () => {
    pauseAudio(startAudioRef.current)
    pauseAudio(completionAudioRef.current)
    activeAudioPhaseRef.current = 'idle'
  }

  // Synchronize startAudioRef and completionAudioRef whenever URLs change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (startAudioRef.current) {
        pauseAudio(startAudioRef.current)
      }
      if (startAudioUrl) {
        const audio = new Audio(startAudioUrl)
        audio.loop = false
        audio.preload = 'auto'
        audio.volume = 0.35
        startAudioRef.current = audio
      } else {
        startAudioRef.current = null
      }
    }
  }, [startAudioUrl])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (completionAudioRef.current) {
        pauseAudio(completionAudioRef.current)
      }
      if (completionAudioUrl) {
        const audio = new Audio(completionAudioUrl)
        audio.loop = false
        audio.preload = 'auto'
        audio.volume = 0.35
        completionAudioRef.current = audio
      } else {
        completionAudioRef.current = null
      }
    }
  }, [completionAudioUrl])

  useEffect(() => {
    activeStartAudioUrlRef.current = startAudioUrl
    activeCompletionAudioUrlRef.current = completionAudioUrl
  }, [startAudioUrl, completionAudioUrl])

  useEffect(() => {
    return () => {
      if (activeStartAudioUrlRef.current) {
        URL.revokeObjectURL(activeStartAudioUrlRef.current)
      }
      if (activeCompletionAudioUrlRef.current) {
        URL.revokeObjectURL(activeCompletionAudioUrlRef.current)
      }
      stopAllTimerAudio()
      startAudioRef.current = null
      completionAudioRef.current = null
    }
  }, [])

  useEffect(() => {
    const stored = window.localStorage.getItem(POMODORO_STORAGE_KEY)
    if (!stored) return

    try {
      const parsed = JSON.parse(stored)
      const restoredMode = Number(parsed.pomodoroMode) || 25
      const restoredDuration = Number(parsed.timerDuration) || restoredMode * 60
      let restoredTimeLeft = Number(parsed.timeLeft)
      let restoredRunning = Boolean(parsed.timerRunning)
      let restoredSessionFinished = Boolean(parsed.sessionFinished)
      const restoredStart = typeof parsed.timerStartTimestamp === 'number' ? parsed.timerStartTimestamp : null
      const restoredCustomMinutes = parsed.customMinutes || String(restoredMode)

      if (restoredRunning && restoredStart) {
        const elapsed = Math.floor((Date.now() - restoredStart) / 1000)
        restoredTimeLeft = Math.max(restoredDuration - elapsed, 0)
        if (restoredTimeLeft <= 0) {
          restoredRunning = false
          restoredSessionFinished = true
        }
      }

      setPomodoroMode(restoredMode)
      setTimerDuration(restoredDuration)
      setCustomMinutes(restoredCustomMinutes)
      setTimeLeft(restoredTimeLeft || restoredDuration)
      setTimerProgress(restoredDuration > 0 ? (restoredTimeLeft / restoredDuration) * 100 : 100)
      setTimerRunning(restoredRunning)
      setTimerStartTimestamp(restoredRunning && restoredStart ? restoredStart : null)
      setSessionFinished(restoredSessionFinished)
      if (restoredSessionFinished || restoredTimeLeft === 0) {
        completionHandledRef.current = true
      }
    } catch (error) {
      console.log('Failed to restore pomodoro state:', error)
    }
  }, [])

  useEffect(() => {
    const saveState = () => {
      window.localStorage.setItem(
        POMODORO_STORAGE_KEY,
        JSON.stringify({
          pomodoroMode,
          timerDuration,
          timeLeft,
          timerStartTimestamp,
          timerRunning,
          sessionFinished,
          customMinutes,
        })
      )
    }

    saveState()
    const handleUnload = () => saveState()
    const handlePageHide = () => saveState()

    window.addEventListener('beforeunload', handleUnload)
    window.addEventListener('pagehide', handlePageHide)
    return () => {
      window.removeEventListener('beforeunload', handleUnload)
      window.removeEventListener('pagehide', handlePageHide)
    }
  }, [pomodoroMode, timerDuration, timeLeft, timerStartTimestamp, timerRunning, sessionFinished, customMinutes])

  useEffect(() => {
    async function loadSavedSounds() {
      try {
        const { getFromStore } = await import('@/lib/offlineDb')
        const startFile = await getFromStore('audio_store', 'start_sound')
        if (startFile instanceof Blob) {
          const url = URL.createObjectURL(startFile)
          setStartAudioUrl(url)
        }
        const completionFile = await getFromStore('audio_store', 'completion_sound')
        if (completionFile instanceof Blob) {
          const url = URL.createObjectURL(completionFile)
          setCompletionAudioUrl(url)
        }
      } catch (err) {
        console.error('Failed to load saved timer sounds:', err)
      }
    }
    void loadSavedSounds()
  }, [])

  const releaseWakeLock = async () => {
    if (!wakeLockSentinelRef.current) return

    try {
      await wakeLockSentinelRef.current.release()
    } catch (err) {
      console.log('Wake lock release error:', err)
    } finally {
      wakeLockSentinelRef.current = null
    }
  }

  const requestWakeLock = async () => {
    if (typeof window === 'undefined' || !('wakeLock' in navigator)) return

    try {
      wakeLockSentinelRef.current = await navigator.wakeLock.request('screen')
    } catch (err) {
      console.log('Wake lock request error:', err)
    }
  }

  useEffect(() => {
    if (!timerRunning) {
      void releaseWakeLock()
      return
    }

    void requestWakeLock()

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && timerRunning) {
        await requestWakeLock()
      } else {
        await releaseWakeLock()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      void releaseWakeLock()
    }
  }, [timerRunning])

  // 2. Pomodoro Timer Countdown Effect
  useEffect(() => {
    if (!timerRunning || timerStartTimestamp === null || sessionFinished) return

    const updateTimer = () => {
      const elapsed = Math.floor((Date.now() - timerStartTimestamp) / 1000)
      const next = Math.max(timerDuration - elapsed, 0)
      setTimeLeft(next)
      setTimerProgress(timerDuration > 0 ? (next / timerDuration) * 100 : 0)

      if (next === 0 && !completionHandledRef.current) {
        completionHandledRef.current = true
        completionPhaseRef.current = false
        setTimerRunning(false)
        setTimerInfo('')
        setSessionFinished(true)
        stopAllTimerAudio()
        playBeep() // Play the beep sound at exact completion
        toast('Focus session completed! Take a break.', 'success')

        startTransition(async () => {
          try {
            const xpRes = await fetch('/api/user/award-xp', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ minutes: pomodoroMode }),
            })

            if (xpRes.ok) {
              const userRes = await fetch('/api/user/profile')
              if (userRes.ok) {
                const data = await userRes.json()
                setUserProfile(data)
              }
            }
          } catch (err) {}
        })
      }
    }

    updateTimer()
    const interval = window.setInterval(updateTimer, 1000)
    return () => window.clearInterval(interval)
  }, [timerRunning, timerStartTimestamp, timerDuration, sessionFinished, toast])

  // 2b. Audio playback synchronization effect (declarative source of truth)
  useEffect(() => {
    if (!timerRunning || sessionFinished || timeLeft <= 0) {
      stopAllTimerAudio()
      return
    }

    if (timeLeft > 6) {
      if (activeAudioPhaseRef.current !== 'start') {
        activeAudioPhaseRef.current = 'start'
        pauseAudio(completionAudioRef.current)
        void tryPlayAudio(startAudioRef.current)
      }
    } else {
      if (activeAudioPhaseRef.current !== 'completion') {
        activeAudioPhaseRef.current = 'completion'
        pauseAudio(startAudioRef.current)
        void tryPlayAudio(completionAudioRef.current)
      }
    }
  }, [timerRunning, timeLeft, sessionFinished, startAudioUrl, completionAudioUrl])


  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const changeTimerMode = (mins: number) => {
    completionHandledRef.current = false
    setSessionFinished(false)
    setTimerRunning(false)
    setTimerStartTimestamp(null)
    setPomodoroMode(mins)
    setTimeLeft(mins * 60)
    setTimerProgress(100)
    setTimerInfo('')

    stopAllTimerAudio()
  }

  const handleApplyCustomTimer = () => {
    const parsedMinutes = Number(customMinutes)

    if (!Number.isFinite(parsedMinutes) || parsedMinutes <= 0) {
      toast('Please enter a valid focus duration.', 'error')
      return
    }

    const safeMinutes = Math.floor(parsedMinutes)
    setCustomMinutes(String(safeMinutes))
    changeTimerMode(safeMinutes)
  }

  const handleStartAudioChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const url = await loadLocalAudio(file)
    setStartAudioUrl(url)

    try {
      const { saveToStore } = await import('@/lib/offlineDb')
      await saveToStore('audio_store', 'start_sound', file)
      toast('Start focus sound saved successfully!', 'success')
    } catch (err) {
      console.error('Failed to save start sound in offline database:', err)
    }
  }

  const handleCompletionAudioChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const url = await loadLocalAudio(file)
    setCompletionAudioUrl(url)

    try {
      const { saveToStore } = await import('@/lib/offlineDb')
      await saveToStore('audio_store', 'completion_sound', file)
      toast('Completion focus sound saved successfully!', 'success')
    } catch (err) {
      console.error('Failed to save completion sound in offline database:', err)
    }
  }

  const handleToggleTimer = () => {
    if (timerRunning) {
      setTimerRunning(false)
      setTimerInfo('')
      stopAllTimerAudio()
      return
    }

    let currentLeft = timeLeft
    if (timeLeft <= 0) {
      const totalSeconds = pomodoroMode * 60
      currentLeft = totalSeconds
      setTimeLeft(totalSeconds)
      setTimerDuration(totalSeconds)
      setTimerStartTimestamp(null)
      setSessionFinished(false)
      completionHandledRef.current = false
      stopAllTimerAudio()
    }

    const totalSeconds = pomodoroMode * 60
    const startOffset = totalSeconds - currentLeft
    setTimerDuration(totalSeconds)
    setTimerStartTimestamp(Date.now() - Math.max(startOffset, 0) * 1000)
    setTimerRunning(true)
    setTimerInfo('Screen wake lock is on while this focus session runs.')

    if (currentLeft > 6) {
      activeAudioPhaseRef.current = 'start'
      pauseAudio(completionAudioRef.current)
      void tryPlayAudio(startAudioRef.current)
    } else if (currentLeft > 0) {
      activeAudioPhaseRef.current = 'completion'
      pauseAudio(startAudioRef.current)
      void tryPlayAudio(completionAudioRef.current)
    }

    toast('Focus session started. Your screen will stay awake until it ends.', 'info')
  }

  // 3. Toggle Habit Completion
  const handleToggleHabit = (habitId: string, recurrence: any) => {
    if (!isHabitDueForDate(recurrence, new Date())) {
      toast('This habit is only available on its scheduled days.', 'info')
      return
    }

    startTransition(async () => {
      const { executeAction } = await import('@/lib/offlineSync')
      const res = await executeAction(
        'toggleHabitDateAction',
        toggleHabitDateAction,
        [habitId, todayStr],
        (args) => {
          const habit = habits.find(h => h._id === args[0])
          if (!habit) return {}
          const isCompleted = habit.completedDates.includes(todayStr)
          const newDates = isCompleted 
            ? habit.completedDates.filter((d: string) => d !== todayStr)
            : [...habit.completedDates, todayStr]
          return {
            habit: {
              ...habit,
              completedDates: newDates,
              streak: isCompleted ? Math.max(0, habit.streak - 1) : habit.streak + 1,
            }
          }
        }
      )
      if (res.success) {
        toast(res.message || 'Habit updated', 'success')
        if (res.habit) {
          setHabits((prev) => prev.map((h) => (h._id === habitId ? res.habit : h)))
        }

        // Refresh User profile for XP/Level gains
        const isOnline = typeof navigator !== 'undefined' && navigator.onLine
        if (isOnline) {
          const profileRes = await fetch('/api/user/profile')
          if (profileRes.ok) {
            const data = await profileRes.json()
            setUserProfile(data)
          }
        } else {
          // Optimistically update XP/Level offline
          const originalHabit = habits.find(h => h._id === habitId)
          const isAddingCompletion = originalHabit ? !originalHabit.completedDates.includes(todayStr) : false
          if (isAddingCompletion) {
            setUserProfile((prev: any) => {
              if (!prev) return prev
              const newXp = prev.xp + 5
              const newLevel = Math.floor(newXp / 100) + 1
              return { ...prev, xp: newXp, level: newLevel }
            })
          }
        }
      } else {
        toast(res.error || 'Failed to update habit', 'error')
      }
    })
  }

  // 4. Toggle Task Status
  const handleToggleTask = (taskId: string) => {
    startTransition(async () => {
      const { executeAction } = await import('@/lib/offlineSync')
      const res = await executeAction(
        'updateTaskStatusAction',
        updateTaskStatusAction,
        [taskId, 'Completed'],
        () => ({ success: true })
      )
      if (res.success) {
        toast(res.message || 'Task completed!', 'success')
        setTasks((prev) => prev.filter((t) => t._id !== taskId))
        
        const isOnline = typeof navigator !== 'undefined' && navigator.onLine
        if (isOnline) {
          const profileRes = await fetch('/api/user/profile')
          if (profileRes.ok) {
            const data = await profileRes.json()
            setUserProfile(data)
          }
        } else {
          // Optimistically update XP/Level offline
          setUserProfile((prev: any) => {
            if (!prev) return prev
            const newXp = prev.xp + 20
            const newLevel = Math.floor(newXp / 100) + 1
            return { ...prev, xp: newXp, level: newLevel }
          })
        }
      } else {
        toast(res.error || 'Failed to complete task', 'error')
      }
    })
  }

  // 5. Time Block Actions
  const handleAddBlock = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const { executeAction } = await import('@/lib/offlineSync')
      const res = await executeAction(
        'createTimeBlockAction',
        createTimeBlockAction,
        [{
          ...newBlock,
          date: todayStr,
        }],
        (args, tempId) => ({
          timeBlock: {
            _id: tempId,
            ...(args[0] as Record<string, unknown>),
            isCompleted: false,
          }
        })
      )
      if (res.success) {
        toast('Planner slot added!', 'success')
        if (res.timeBlock) {
          setTimeBlocks((prev) => [...prev, res.timeBlock].sort((a, b) => a.position - b.position))
        }
        setShowAddBlock(false)
        setNewBlock({ title: '', startTime: '08:00', endTime: '09:00', reminderConfigs: [] })
      } else {
        toast(res.error || 'Failed to add planner slot', 'error')
      }
    })
  }

  const handleToggleBlock = (blockId: string, isCompleted: boolean) => {
    startTransition(async () => {
      const { executeAction } = await import('@/lib/offlineSync')
      const res = await executeAction(
        'updateTimeBlockAction',
        updateTimeBlockAction,
        [blockId, { isCompleted: !isCompleted }],
        (args) => {
          const updatePayload = args[1] as { isCompleted?: boolean }
          const block = timeBlocks.find((b) => b._id === args[0])
          return {
            timeBlock: {
              ...block,
              isCompleted: updatePayload.isCompleted ?? false,
            }
          }
        }
      )
      if (res.success) {
        if (res.timeBlock) {
          setTimeBlocks((prev) =>
            prev.map((b) => (b._id === blockId ? res.timeBlock : b))
          )
        }
      } else {
        toast(res.error || 'Failed to update planner slot', 'error')
      }
    })
  }

  const handleDeleteBlock = (blockId: string) => {
    startTransition(async () => {
      const { executeAction } = await import('@/lib/offlineSync')
      const res = await executeAction(
        'deleteTimeBlockAction',
        deleteTimeBlockAction,
        [blockId],
        () => ({ success: true })
      )
      if (res.success) {
        setTimeBlocks((prev) => prev.filter((b) => b._id !== blockId))
        toast('Planner slot removed.', 'info')
      } else {
        toast(res.error || 'Failed to remove slot', 'error')
      }
    })
  }

  // 6. Calculate Dynamic Daily Score %
  const todayHabits = habits.filter((habit) => {
    const recurrenceObj = {
      type: habit.recurrenceType ?? habit.recurrence?.type,
      days: habit.recurrenceDays ?? habit.recurrence?.days,
    }
    return isHabitDueForDate(recurrenceObj, new Date())
  })

  const totalHabits = todayHabits.length
  const completedHabits = todayHabits.filter((h) => h.completedDates.includes(todayStr)).length

  const totalPlannerBlocks = timeBlocks.length
  const completedPlannerBlocks = timeBlocks.filter((b) => b.isCompleted).length

  // We consider completed habits + completed planner items
  const totalItems = totalHabits + totalPlannerBlocks
  const completedItems = completedHabits + completedPlannerBlocks
  const dailyScore = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0

  return (
    <div className="space-y-6">
      {!userProfile?.emailVerified && (
        <div className="rounded-2xl border border-amber-300/70 bg-amber-100/80 p-4 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-amber-200 text-amber-900 dark:bg-amber-500/20 dark:text-amber-100">
              !
            </span>
            <div>
              <p className="font-semibold">Email verification required</p>
              <p className="text-xs text-amber-700 dark:text-amber-200">Please verify your email to ensure you receive full notifications and reminders.</p>
            </div>
          </div>
        </div>
      )}
      <TutorialGuide autoShow buttonLabel="Show guide" buttonClassName="sm:inline-flex" />
      
      <div className="flex flex-col gap-4 rounded-2xl border border-border/80 bg-gradient-to-r from-indigo-50/80 via-white to-sky-50/80 p-6 shadow-sm backdrop-blur-md dark:from-indigo-950/40 dark:via-zinc-900/80 dark:to-sky-950/40 md:flex-row md:items-center md:justify-between">
        <div className="max-w-2xl">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-indigo-200 bg-indigo-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/15 dark:text-indigo-300">
              Focus mode
            </span>
            <div className="flex justify-end">
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowWidgetEditor((prev) => !prev)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/70 bg-background/90 text-zinc-600 shadow-sm transition hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            aria-label="Customize dashboard widgets"
            aria-expanded={showWidgetEditor}
          >
            <Pencil className="h-4 w-4" />
          </button>

          <AnimatePresence>
            {showWidgetEditor && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="fixed left-0 md:left-50 top-20 md:top-0 z-99 w-64 rounded-2xl border border-border/70 bg-background/95 p-3 shadow-xl backdrop-blur"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-500">
                  Show on dashboard
                </p>
                <div className="mt-3 space-y-2">
                  {([
                    { key: 'dailyScore', label: 'Daily score' },
                    { key: 'pomodoro', label: 'Pomodoro focus' },
                    { key: 'schedule', label: 'Today&apos;s schedule' },
                  ] as Array<{ key: DashboardWidgetKey; label: string }>).map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => toggleWidgetVisibility(item.key)}
                      className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left transition ${
                        widgetVisibility[item.key]
                          ? 'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-200'
                          : 'border-border/70 bg-card/70 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800'
                      }`}
                    >
                      <span className="text-sm font-medium">{item.label}</span>
                      <span className={`flex h-5 w-5 items-center justify-center rounded border ${widgetVisibility[item.key] ? 'border-indigo-500 bg-indigo-500 text-white' : 'border-zinc-300 text-transparent dark:border-zinc-600'}`}>
                        {widgetVisibility[item.key] ? <Check className="h-3.5 w-3.5" /> : null}
                      </span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
          </div>
          <h2 className="text-2xl font-extrabold text-zinc-950 dark:text-white md:text-3xl">
            Good to see you, {userProfile?.name?.split(' ')[0] || 'Monarch'}
          </h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-zinc-700 dark:text-zinc-300">
            &quot;{quote}&quot;
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200/80 bg-white/80 p-4 text-left shadow-sm dark:border-zinc-700/70 dark:bg-zinc-900/70 md:text-right">
          <p className="text-xl font-bold font-mono tracking-tight text-indigo-600 dark:text-indigo-400 md:text-2xl">
            {currentTime}
          </p>
          <p className="mt-1 text-sm font-semibold text-zinc-600 dark:text-zinc-400">
            {currentDate}
          </p>
        </div>
      </div>

      {/* Grid Widgets Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Side: Score & Focus Timer */}
        <div className="space-y-6 flex flex-col">
          
          {widgetVisibility.dailyScore && (
            <Card className="border-border bg-card/30 flex-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-zinc-500">Daily Score</CardTitle>
              <CardDescription className="text-xs">Your consistency rate for today</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-6">
              <div className="relative w-36 h-36 flex items-center justify-center">
                {/* SVG circular Ring */}
                <svg className="w-full h-full transform -rotate-90">
                  <circle 
                    cx="72" 
                    cy="72" 
                    r="60" 
                    stroke="currentColor" 
                    className="text-zinc-200 dark:text-zinc-800"
                    strokeWidth="8" 
                    fill="transparent" 
                  />
                  <circle 
                    cx="72" 
                    cy="72" 
                    r="60" 
                    stroke="currentColor" 
                    className="text-indigo-500 transition-all duration-1000 ease-out"
                    strokeWidth="8" 
                    fill="transparent" 
                    strokeDasharray={376.8}
                    strokeDashoffset={376.8 - (376.8 * dailyScore) / 100}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute text-center">
                  <span className="text-3xl font-extrabold font-mono text-zinc-900 dark:text-white">{dailyScore}%</span>
                  <span className="block text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500 mt-0.5">Completed</span>
                </div>
              </div>
              
              <div className="mt-4 flex gap-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500/20 border border-indigo-500/40" />
                  Habits: {completedHabits}/{totalHabits}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/20 border border-emerald-500/40" />
                  Planner: {completedPlannerBlocks}/{totalPlannerBlocks}
                </span>
              </div>
            </CardContent>
            </Card>
          )}

          {widgetVisibility.pomodoro && (
            <Card className="border-border bg-card/30 z-0">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-zinc-500">Pomodoro focus</CardTitle>
                <Timer className="w-4 h-4 text-zinc-400" />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Timer text display */}
              <div className="text-center py-4 relative">
                <p className="text-5xl font-extrabold font-mono tracking-tight text-zinc-900 dark:text-white">
                  {formatTimer(timeLeft)}
                </p>
                <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-1 rounded-full mt-4 overflow-hidden">
                  <div 
                    className="bg-indigo-500 h-full transition-all duration-300"
                    style={{ width: `${timerProgress}%` }}
                  />
                </div>
              </div>

              {/* Mode switches */}
              <div className="flex justify-center gap-2">
                <Button 
                  onClick={() => changeTimerMode(25)} 
                  variant={pomodoroMode === 25 ? 'primary' : 'outline'} 
                  size="sm"
                  className="text-xs h-8 px-2.5"
                >
                  25m
                </Button>
                <Button 
                  onClick={() => changeTimerMode(50)} 
                  variant={pomodoroMode === 50 ? 'primary' : 'outline'} 
                  size="sm"
                  className="text-xs h-8 px-2.5"
                >
                  50m
                </Button>
                <Button 
                  onClick={() => changeTimerMode(15)} 
                  variant={pomodoroMode === 15 ? 'primary' : 'outline'} 
                  size="sm"
                  className="text-xs h-8 px-2.5"
                >
                  15m
                </Button>
              </div>

              <div className="space-y-2 rounded-xl border border-indigo-200/70 bg-indigo-50/80 p-3 text-xs text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-200">
                <label htmlFor="customTimer" className="block font-semibold">Custom timer</label>
                <div className="flex gap-2">
                  <Input
                    id="customTimer"
                    type="number"
                    min="1"
                    step="1"
                    value={customMinutes}
                    onChange={(e) => setCustomMinutes(e.target.value)}
                    className="h-9"
                    placeholder="Minutes"
                  />
                  <Button onClick={handleApplyCustomTimer} variant="outline" size="sm" className="h-9 px-3">
                    Set
                  </Button>
                </div>
              </div>

              <div className="space-y-2 rounded-xl border border-zinc-200/70 bg-zinc-50/80 p-3 text-xs text-zinc-700 dark:border-zinc-700/30 dark:bg-zinc-950/10 dark:text-zinc-300">
                <div className="space-y-3">
                  <div>
                    <label htmlFor="startAudio" className="block font-semibold">Start sound</label>
                    <Input
                      id="startAudio"
                      type="file"
                      accept="audio/*"
                      onChange={handleStartAudioChange}
                      className="h-9"
                    />
                    
                  </div>

                  <div>
                    <label htmlFor="completionAudio" className="block font-semibold">Completion sound</label>
                    <Input
                      id="completionAudio"
                      type="file"
                      accept="audio/*"
                      onChange={handleCompletionAudioChange}
                      className="h-9"
                    />
                    
                  </div>
                </div>
              </div>

              {timerInfo ? (
                <p className="text-xs text-emerald-600 dark:text-emerald-400">{timerInfo}</p>
              ) : (
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Use it to improve focus and productivity.</p>
              )}
              <div className="flex flex-col gap-1 text-xs text-zinc-500 dark:text-zinc-400">
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-zinc-200 dark:border-zinc-700 bg-white/80 dark:bg-zinc-950/70 px-2 py-1">Start sound: {startAudioUrl ? 'Custom active' : 'Default'}</span>
                  <span className="rounded-full border border-zinc-200 dark:border-zinc-700 bg-white/80 dark:bg-zinc-950/70 px-2 py-1">Completion sound: {completionAudioUrl ? 'Custom active' : 'Default'}</span>
                </div>
              </div>

              {/* Buttons controls */}
              <div className="flex gap-2">
                <Button
                  onClick={handleToggleTimer}
                  variant="primary"
                  className="flex-1 gap-2"
                >
                  {timerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  {timerRunning ? 'Pause' : 'Start'}
                </Button>
                
                <Button
                  onClick={() => changeTimerMode(pomodoroMode)}
                  variant="outline"
                  className="p-2"
                  aria-label="Reset timer"
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
            </Card>
          )}
        </div>

        {widgetVisibility.schedule ? (
          <Card className="border-border bg-card/30 md:col-span-2 flex flex-col">
          <CardHeader className="pb-2 border-b border-border/40 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-zinc-500">Today&apos;s Schedule</CardTitle>
              <CardDescription className="text-xs">Time blocked day timeline</CardDescription>
            </div>
            <Button
              onClick={() => setShowAddBlock(!showAddBlock)}
              variant="outline"
              size="sm"
              className="gap-1.5 h-8 px-2.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Add Block
            </Button>
          </CardHeader>
          <CardContent className="flex-1 py-4 overflow-y-auto max-h-[460px] space-y-4">
            
            {/* Popover form block */}
            <AnimatePresence>
              {showAddBlock && (
                <motion.form
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  onSubmit={handleAddBlock}
                  className="p-4 rounded-lg border border-border bg-card/80 space-y-3 overflow-hidden"
                >
                  <div className="space-y-1">
                    <Label htmlFor="blockTitle" className="text-xs">Activity Name</Label>
                    <Input
                      id="blockTitle"
                      type="text"
                      placeholder="e.g. Wake Up, Running, Coding"
                      value={newBlock.title}
                      onChange={(e) => setNewBlock((prev) => ({ ...prev, title: e.target.value }))}
                      required
                      className="h-8"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label htmlFor="startTime" className="text-xs">Start Time</Label>
                      <Input
                        id="startTime"
                        type="time"
                        value={newBlock.startTime}
                        onChange={(e) => setNewBlock((prev) => ({ ...prev, startTime: e.target.value }))}
                        required
                        className="h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="endTime" className="text-xs">End Time</Label>
                      <Input
                        id="endTime"
                        type="time"
                        value={newBlock.endTime}
                        onChange={(e) => setNewBlock((prev) => ({ ...prev, endTime: e.target.value }))}
                        required
                        className="h-8"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Reminders</Label>
                    <ReminderConfigPanel
                      configs={newBlock.reminderConfigs}
                      onConfigsChange={(configs) => setNewBlock((prev) => ({ ...prev, reminderConfigs: configs }))}
                    />
                  </div>

                  <div className="flex gap-2 justify-end pt-2">
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setShowAddBlock(false)}
                      className="text-xs h-8"
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      variant="primary" 
                      size="sm"
                      className="text-xs h-8"
                      isLoading={isPending}
                    >
                      Save Block
                    </Button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>

            {/* List schedule slots */}
            <div className="space-y-2 relative pl-4 border-l border-indigo-500/20">
              {timeBlocks.length === 0 ? (
                <p className="text-zinc-500 dark:text-zinc-400 text-xs italic py-4 text-center">
                  Your daily planner is empty. Create time blocks to plan your day.
                </p>
              ) : (
                timeBlocks.map((block) => (
                  <div
                    key={block._id}
                    className={`group flex items-center justify-between p-3.5 rounded-lg border transition-all ${
                      block.isCompleted
                        ? 'bg-zinc-100/50 dark:bg-zinc-950/20 border-border text-zinc-400'
                        : 'bg-card border-border hover:border-zinc-300 dark:hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Check off trigger */}
                      <button
                        onClick={() => handleToggleBlock(block._id, block.isCompleted)}
                        disabled={isPending}
                        className={`w-5 h-5 rounded border flex items-center justify-center transition-all cursor-pointer ${
                          block.isCompleted
                            ? 'bg-indigo-500 border-indigo-500 text-white'
                            : 'border-zinc-300 dark:border-zinc-700 hover:border-indigo-500'
                        }`}
                      >
                        {block.isCompleted && <Check className="w-3 h-3 stroke-[3]" />}
                      </button>

                      <div className="space-y-0.5">
                        <p className={`text-sm font-semibold ${block.isCompleted ? 'line-through text-zinc-400 dark:text-zinc-500' : 'text-zinc-900 dark:text-zinc-100'}`}>
                          {block.title}
                        </p>
                        <p className="text-xs font-mono font-bold text-zinc-400 dark:text-zinc-500">
                          {block.startTime} - {block.endTime}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteBlock(block._id)}
                      disabled={isPending}
                      className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-rose-500 transition-all cursor-pointer rounded hover:bg-rose-500/10"
                      aria-label="Delete block"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
          </Card>
        ) : (
          <div className="flex items-center justify-center rounded-2xl border border-dashed border-border/70 bg-card/30 p-8 text-center text-sm text-zinc-500 md:col-span-2 dark:text-zinc-400">
            Choose a widget to display from the pencil menu.
          </div>
        )}
      </div>

      {/* Grid bottom elements: Habits & Deadlines */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Today's Habits Checklist */}
        <Card className="border-border bg-card/30">
          <CardHeader className="pb-2 flex flex-row items-center justify-between border-b border-border/40">
            <div>
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-zinc-500">Habit Checkmarks</CardTitle>
              <CardDescription className="text-xs">Establish your daily routine</CardDescription>
            </div>
            <Flame className="w-5 h-5 text-indigo-500 animate-pulse" />
          </CardHeader>
          <CardContent className="py-4 space-y-2">
            {todayHabits.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-zinc-500 dark:text-zinc-400 text-xs italic mb-2">No habits due today.</p>
                <Link href="/dashboard/habits">
                  <Button variant="outline" size="sm" className="text-xs">Setup Habit Tracker</Button>
                </Link>
              </div>
            ) : (
              todayHabits.map((habit) => {
                const recurrenceObj = {
                  type: habit.recurrenceType ?? habit.recurrence?.type,
                  days: habit.recurrenceDays ?? habit.recurrence?.days,
                }

                const isCompletedToday = habit.completedDates.includes(todayStr)
                return (
                  <div
                    key={habit._id}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                      isCompletedToday
                        ? 'bg-indigo-500/5 border-indigo-500/20 text-indigo-900 dark:text-indigo-400'
                        : 'bg-card border-border hover:border-zinc-300 dark:hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleToggleHabit(habit._id, recurrenceObj)}
                        disabled={isPending}
                        className={`w-5.5 h-5.5 rounded-full border flex items-center justify-center transition-all cursor-pointer ${
                          isCompletedToday
                            ? 'bg-indigo-500 border-indigo-500 text-white shadow-sm'
                            : 'border-zinc-300 dark:border-zinc-700 hover:border-indigo-500'
                        }`}
                      >
                        {isCompletedToday && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </button>
                      <div>
                        <span className={`text-sm font-medium ${isCompletedToday ? 'text-indigo-600 dark:text-indigo-300 line-through' : 'text-zinc-900 dark:text-zinc-100'}`}>
                          {habit.name}
                        </span>
                        <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
                          {getHabitRecurrenceLabel(recurrenceObj)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs font-bold text-zinc-400 dark:text-zinc-500">
                      <span>Streak:</span>
                      <span className="flex items-center gap-0.5 text-amber-500">
                        <Flame className="w-3.5 h-3.5 fill-current" />
                        {habit.streak}
                      </span>
                    </div>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>

        {/* Immediate Upcoming Incomplete Deadlines */}
        <Card className="border-border bg-card/30">
          <CardHeader className="pb-2 flex flex-row items-center justify-between border-b border-border/40">
            <div>
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-zinc-500">Immediate Tasks</CardTitle>
              <CardDescription className="text-xs">Deadlines due soon</CardDescription>
            </div>
            <AlertCircle className="w-5 h-5 text-indigo-500" />
          </CardHeader>
          <CardContent className="py-4 space-y-2">
            {tasks.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-zinc-500 dark:text-zinc-400 text-xs italic mb-2">No upcoming deadlines.</p>
                <Link href="/dashboard/tasks">
                  <Button variant="outline" size="sm" className="text-xs">Create New Task</Button>
                </Link>
              </div>
            ) : (
              tasks.slice(0, 4).map((task) => (
                <div
                  key={task._id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:border-zinc-300 dark:hover:border-zinc-700 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleToggleTask(task._id)}
                      disabled={isPending}
                      className="w-5 h-5 rounded border border-zinc-300 dark:border-zinc-700 hover:border-indigo-500 flex items-center justify-center transition-all cursor-pointer"
                    >
                      <span className="w-2.5 h-2.5 rounded bg-transparent group-hover:bg-zinc-200" />
                    </button>
                    
                    <div className="space-y-0.5">
                      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{task.title}</p>
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{task.category}</p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    {/* Priority badge */}
                    <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded border ${
                      task.priority === 'High'
                        ? 'bg-rose-500/10 border-rose-500/20 text-rose-500'
                        : task.priority === 'Medium'
                        ? 'bg-amber-500/10 border-amber-500/20 text-amber-500'
                        : 'bg-zinc-500/10 border-zinc-500/20 text-zinc-500'
                    }`}>
                      {task.priority}
                    </span>
                    
                    {/* Date */}
                    <span className="text-[10px] font-medium text-zinc-400">
                      {new Date(task.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  )
}
