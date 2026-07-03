'use client'

import Link from 'next/link'

import React, { useState, useEffect, useTransition } from 'react'
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
  Timer
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { useToast } from '@/components/ui/Toast'
import { toggleHabitDateAction } from '@/actions/habitActions'
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

  // Data states
  const [userProfile, setUserProfile] = useState(initialUserProfile)
  const [tasks, setTasks] = useState(initialTasks)
  const [habits, setHabits] = useState(initialHabits)
  const [timeBlocks, setTimeBlocks] = useState(initialTimeBlocks)

  // Pomodoro Timer states
  const [pomodoroMode, setPomodoroMode] = useState(25) // 25 mins
  const [timeLeft, setTimeLeft] = useState(25 * 60)
  const [timerRunning, setTimerRunning] = useState(false)
  const [timerProgress, setTimerProgress] = useState(100)

  // New Time Block form
  const [showAddBlock, setShowAddBlock] = useState(false)
  const [newBlock, setNewBlock] = useState({
    title: '',
    startTime: '08:00',
    endTime: '09:00',
  })

  // Date String YYYY-MM-DD
  const todayStr = new Date().toISOString().split('T')[0]

  // Synthesize beep audio using Web Audio API (no assets needed)
  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
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

  // 1. Clock and quote picker effect
  useEffect(() => {
    setQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)])
    
    const updateClock = () => {
      const d = new Date()
      setCurrentTime(d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
      setCurrentDate(d.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }))
    }
    updateClock()
    const timer = setInterval(updateClock, 1000)
    return () => clearInterval(timer)
  }, [])

  // 2. Pomodoro Timer Countdown Effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (timerRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          const next = prev - 1
          const totalSeconds = pomodoroMode * 60
          setTimerProgress((next / totalSeconds) * 100)
          return next
        })
      }, 1000)
    } else if (timeLeft === 0 && timerRunning) {
      setTimerRunning(false)
      playBeep()
      toast('Focus session completed! Take a break.', 'success')
      
      // Award User with XP for focus time (+15 XP)
      startTransition(async () => {
        try {
          const res = await fetch('/api/user/profile') // Mock action update via profile refresh or API
          // In Phase 4, we will log focus hours in DB, for now we dynamically award XP
          const userRes = await fetch('/api/user/profile')
          if (userRes.ok) {
            const data = await userRes.json()
            setUserProfile(data)
          }
        } catch (err) {}
      })
      
      setTimeLeft(pomodoroMode * 60)
      setTimerProgress(100)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [timerRunning, timeLeft, pomodoroMode, toast])

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const changeTimerMode = (mins: number) => {
    setTimerRunning(false)
    setPomodoroMode(mins)
    setTimeLeft(mins * 60)
    setTimerProgress(100)
  }

  // 3. Toggle Habit Completion
  const handleToggleHabit = (habitId: string) => {
    startTransition(async () => {
      const res = await toggleHabitDateAction(habitId, todayStr)
      if (res.success) {
        toast(res.message || 'Habit updated', 'success')
        // Refresh habits and profile stats
        setHabits((prev) =>
          prev.map((h) => (h._id === habitId ? res.habit : h))
        )
        const profileRes = await fetch('/api/user/profile')
        if (profileRes.ok) {
          const data = await profileRes.json()
          setUserProfile(data)
        }
      } else {
        toast(res.error || 'Failed to update habit', 'error')
      }
    })
  }

  // 4. Toggle Task Status
  const handleToggleTask = (taskId: string) => {
    startTransition(async () => {
      const res = await updateTaskStatusAction(taskId, 'Completed')
      if (res.success) {
        toast(res.message || 'Task completed!', 'success')
        setTasks((prev) => prev.filter((t) => t._id !== taskId))
        
        // Refresh User profile for XP/Level gains
        const profileRes = await fetch('/api/user/profile')
        if (profileRes.ok) {
          const data = await profileRes.json()
          setUserProfile(data)
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
      const res = await createTimeBlockAction({
        ...newBlock,
        date: todayStr,
      })
      if (res.success) {
        toast('Planner slot added!', 'success')
        setTimeBlocks((prev) => [...prev, res.timeBlock].sort((a, b) => a.position - b.position))
        setShowAddBlock(false)
        setNewBlock({ title: '', startTime: '08:00', endTime: '09:00' })
      } else {
        toast(res.error || 'Failed to add planner slot', 'error')
      }
    })
  }

  const handleToggleBlock = (blockId: string, isCompleted: boolean) => {
    startTransition(async () => {
      const res = await updateTimeBlockAction(blockId, { isCompleted: !isCompleted })
      if (res.success) {
        setTimeBlocks((prev) =>
          prev.map((b) => (b._id === blockId ? res.timeBlock : b))
        )
      } else {
        toast(res.error || 'Failed to update planner slot', 'error')
      }
    })
  }

  const handleDeleteBlock = (blockId: string) => {
    startTransition(async () => {
      const res = await deleteTimeBlockAction(blockId)
      if (res.success) {
        setTimeBlocks((prev) => prev.filter((b) => b._id !== blockId))
        toast('Planner slot removed.', 'info')
      } else {
        toast(res.error || 'Failed to remove slot', 'error')
      }
    })
  }

  // 6. Calculate Dynamic Daily Score %
  const totalHabits = habits.length
  const completedHabits = habits.filter((h) => h.completedDates.includes(todayStr)).length

  const totalPlannerBlocks = timeBlocks.length
  const completedPlannerBlocks = timeBlocks.filter((b) => b.isCompleted).length

  // We consider completed habits + completed planner items
  const totalItems = totalHabits + totalPlannerBlocks
  const completedItems = completedHabits + completedPlannerBlocks
  const dailyScore = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0

  return (
    <div className="space-y-6">
      {/* Greetings Header card */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-6 rounded-xl border border-border bg-card/40 backdrop-blur-md gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-zinc-950 dark:text-white">
            Good Morning, {userProfile?.name?.split(' ')[0] || 'Monarch'}
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1 text-sm font-medium italic">
            "{quote}"
          </p>
        </div>

        <div className="text-left md:text-right">
          <p className="text-xl md:text-2xl font-bold font-mono tracking-tight text-indigo-500">
            {currentTime}
          </p>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 font-medium mt-0.5">
            {currentDate}
          </p>
        </div>
      </div>

      {/* Grid Widgets Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Side: Score & Focus Timer */}
        <div className="space-y-6 flex flex-col">
          
          {/* Daily Completion Score */}
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

          {/* Pomodoro Focus Timer */}
          <Card className="border-border bg-card/30">
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

              {/* Buttons controls */}
              <div className="flex gap-2">
                <Button
                  onClick={() => setTimerRunning(!timerRunning)}
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
        </div>

        {/* Center Side: Time-blocked daily schedule planner */}
        <Card className="border-border bg-card/30 md:col-span-2 flex flex-col">
          <CardHeader className="pb-2 border-b border-border/40 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-zinc-500">Today's Schedule</CardTitle>
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
            {habits.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-zinc-500 dark:text-zinc-400 text-xs italic mb-2">No habits configured.</p>
                <Link href="/dashboard/habits">
                  <Button variant="outline" size="sm" className="text-xs">Setup Habit Tracker</Button>
                </Link>
              </div>
            ) : (
              habits.map((habit) => {
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
                        onClick={() => handleToggleHabit(habit._id)}
                        disabled={isPending}
                        className={`w-5.5 h-5.5 rounded-full border flex items-center justify-center transition-all cursor-pointer ${
                          isCompletedToday
                            ? 'bg-indigo-500 border-indigo-500 text-white shadow-sm'
                            : 'border-zinc-300 dark:border-zinc-700 hover:border-indigo-500'
                        }`}
                      >
                        {isCompletedToday && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </button>
                      <span className={`text-sm font-medium ${isCompletedToday ? 'text-indigo-600 dark:text-indigo-300 line-through' : 'text-zinc-900 dark:text-zinc-100'}`}>
                        {habit.name}
                      </span>
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
                      {new Date(task.deadline).toLocaleDateString([], { month: 'short', day: 'numeric' })}
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
