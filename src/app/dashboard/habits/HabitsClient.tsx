'use client'

import React, { useState, useTransition } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, Flame, Award, Check } from 'lucide-react'
import { HABIT_RECURRENCE_DAYS, HABIT_RECURRENCE_LABELS, isHabitDueForDate, getHabitRecurrenceLabel, formatLocalDate, type HabitRecurrenceType } from '@/lib/habitRecurrence'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Card, CardContent } from '@/components/ui/Card'
import { useToast } from '@/components/ui/Toast'
import { ReminderConfigPanel } from '@/components/ui/ReminderConfigPanel'
import { createHabitAction, getHabitsAction, toggleHabitDateAction, deleteHabitAction } from '@/actions/habitActions'

interface HabitsClientProps {
  initialHabits: any[]
}

export default function HabitsClient({ initialHabits }: HabitsClientProps) {
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()

  // State
  const [habits, setHabits] = useState<any[]>(initialHabits)
  const [newHabitName, setNewHabitName] = useState('')
  const [recurrenceType, setRecurrenceType] = useState<HabitRecurrenceType>('daily')
  const [selectedDays, setSelectedDays] = useState<string[]>([])
  const [reminderConfigs, setReminderConfigs] = useState<Array<{ enabled: boolean; reminderTime: string; message?: string; notificationType: 'email' | 'in-app' | 'both' }>>([])

  const todayStr = formatLocalDate(new Date())

  // Add new habit
  const handleCreateHabit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newHabitName.trim()) return

    startTransition(async () => {
      const recurrence = {
        type: recurrenceType,
        days: recurrenceType === 'custom-days' ? selectedDays : [],
      }

      const res = await createHabitAction(newHabitName, recurrence, reminderConfigs.filter((r) => r.enabled))
      if (res.success) {
        toast(res.message || 'Habit created!', 'success')
        // prefer server-returned habit shape (with normalized recurrence fields)
        setHabits((prev) => [res.habit, ...prev])
        setNewHabitName('')
        setRecurrenceType('daily')
        setSelectedDays([])
        setReminderConfigs([])
      } else {
        toast(res.error || 'Failed to create habit', 'error')
      }
    })
  }

  // Toggle habit check status
  const handleToggleHabit = (habitId: string, recurrence: any) => {
    if (!isHabitDueForDate(recurrence, new Date())) {
      toast('This habit is only available on its scheduled days.', 'info')
      return
    }

    startTransition(async () => {
      const res = await toggleHabitDateAction(habitId, todayStr)
      if (res.success) {
        toast(res.message || 'Habit state toggled!', 'success')
        const habitsRes = await getHabitsAction()
        if (habitsRes.success && habitsRes.habits) {
          setHabits(habitsRes.habits)
        } else {
          setHabits((prev) => prev.map((h) => (h._id === habitId ? res.habit : h)))
        }
      } else {
        toast(res.error || 'Failed to toggle habit', 'error')
      }
    })
  }

  // Delete habit
  const handleConfirmDelete = (habitId: string) => {
    if (!confirm('Are you sure you want to delete this habit tracker?')) return

    startTransition(async () => {
      const res = await deleteHabitAction(habitId)
      if (res.success) {
        toast(res.message || 'Tracker deleted', 'info')
        setHabits((prev) => prev.filter((h) => h._id !== habitId))
      } else {
        toast(res.error || 'Failed to delete habit', 'error')
      }
    })
  }

  const toggleDay = (day: string) => {
    setSelectedDays((prev) => prev.includes(day) ? prev.filter((item) => item !== day) : [...prev, day])
  }

  // Helper to render the contribution/completion heatmap grid for the current month
  const renderHeatmap = (completedDates: string[]) => {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() // 0-indexed

    // Days in current month
    const totalDays = new Date(year, month + 1, 0).getDate()
    
    // First day of the month offset (0 for Sunday, 6 for Saturday)
    const firstDayIndex = new Date(year, month, 1).getDay()

    const daysArray = []

    // Empty spaces for padding before the 1st of the month
    for (let i = 0; i < firstDayIndex; i++) {
      daysArray.push({ type: 'empty', key: `empty-${i}` })
    }

    // Days 1 to totalDays
    for (let day = 1; day <= totalDays; day++) {
      const dateString = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
      const isCompleted = completedDates.includes(dateString)
      daysArray.push({ type: 'day', day, dateString, isCompleted, key: `day-${day}` })
    }

    const weekdays = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

    return (
      <div className="space-y-2">
        {/* Month Title */}
        <p className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
          {now.toLocaleString('default', { month: 'long' })} {year}
        </p>

        {/* Calendar Grid wrapper */}
        <div className="grid grid-cols-7 gap-1 text-center w-full max-w-[210px]">
          {/* Weekday headers */}
          {weekdays.map((w, i) => (
            <span key={i} className="text-[9px] font-bold text-zinc-400 dark:text-zinc-600 select-none">
              {w}
            </span>
          ))}

          {/* Days cells */}
          {daysArray.map((cell) => {
            if (cell.type === 'empty') {
              return <div key={cell.key} className="w-6 h-6" />
            }

            return (
              <div
                key={cell.key}
                title={cell.dateString}
                className={`w-6.5 h-6.5 rounded flex items-center justify-center text-[10px] font-bold select-none transition-colors duration-200 cursor-help ${
                  cell.isCompleted
                    ? 'bg-indigo-500 text-white font-extrabold shadow-sm'
                    : 'bg-zinc-100 dark:bg-zinc-900 border border-border/40 text-zinc-500 hover:border-zinc-400 dark:hover:border-zinc-700'
                }`}
              >
                {cell.day}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-white">Habit Tracker</h1>
        <p className="text-zinc-500 dark:text-zinc-400 mt-1 text-sm font-medium">Establish consistency and build positive routines</p>
      </div>

      {/* Input panel Form */}
      <Card className="border-border bg-card/40 backdrop-blur-md">
        <CardContent className="pt-6">
          <form onSubmit={handleCreateHabit} className="space-y-3">
            <div className="flex flex-col gap-2 md:flex-row">
              <Input
                placeholder="e.g. Running, LeetCode, Drink Water, Sleep before 9"
                value={newHabitName}
                onChange={(e) => setNewHabitName(e.target.value)}
                disabled={isPending}
                required
                className="bg-background/50 border-border"
              />
              <Button
                type="submit"
                variant="primary"
                className="gap-2 cursor-pointer shadow-sm"
                isLoading={isPending}
              >
                <Plus className="w-4 h-4" /> Start Tracking
              </Button>
            </div>

            <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-background/40 p-3 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-wrap gap-2">
                {(['daily', 'weekdays', 'weekends', 'monthly-start', 'monthly-end', 'custom-days'] as HabitRecurrenceType[]).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setRecurrenceType(option)}
                    suppressHydrationWarning
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${recurrenceType === option ? 'bg-indigo-500 text-white' : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'}`}
                  >
                    {HABIT_RECURRENCE_LABELS[option]}
                  </button>
                ))}
              </div>

              {recurrenceType === 'custom-days' && (
                <div className="flex flex-wrap gap-1.5">
                  {HABIT_RECURRENCE_DAYS.map((day) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase ${selectedDays.includes(day) ? 'bg-emerald-500 text-white' : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'}`}
                    >
                      {day.slice(0, 3)}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Daily Reminders</Label>
              <ReminderConfigPanel
                configs={reminderConfigs}
                onConfigsChange={setReminderConfigs}
                timeOnly={true}
                title="Daily Habit Reminders"
                description="Set a specific time for daily habit reminders"
              />
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Habit items List Grid */}
      <div className="grid grid-cols-1 gap-6">
        <AnimatePresence mode="popLayout">
          {habits.length === 0 ? (
            <p className="text-center text-sm text-zinc-500 italic py-16">
              You are not tracking any habits yet. Start typing above to arise!
            </p>
          ) : (
            habits.map((habit) => {
              const recurrenceObj = {
                type: habit.recurrenceType ?? habit.recurrence?.type,
                days: habit.recurrenceDays ?? habit.recurrence?.days,
              }

              const isDueToday = isHabitDueForDate(recurrenceObj, new Date())
              const isCompletedToday = isDueToday && habit.completedDates.includes(todayStr)
              const totalCompletions = habit.completedDates.length
              
              return (
                <motion.div
                  key={habit._id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-6 rounded-xl border border-border bg-card hover:shadow-md transition-all flex flex-col md:flex-row justify-between gap-6"
                >
                  {/* Left Column: Status checklist and metrics */}
                  <div className="space-y-4 flex-1">
                    
                    {/* Status checkbox and Title */}
                    <div className="flex items-center gap-3.5">
                      <button
                        onClick={() => handleToggleHabit(habit._id, recurrenceObj)}
                        disabled={isPending || !isDueToday}
                        className={`w-7 h-7 rounded-full border flex items-center justify-center transition-all ${isDueToday ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'} ${
                          isCompletedToday
                            ? 'bg-indigo-500 border-indigo-500 text-white shadow-md'
                            : 'border-zinc-300 dark:border-zinc-700 hover:border-indigo-500'
                        }`}
                      >
                        {isCompletedToday && <Check className="w-4.5 h-4.5 stroke-[3]" />}
                      </button>

                      <div>
                        <h3 className={`text-lg font-bold ${isCompletedToday ? 'text-indigo-600 dark:text-indigo-450 line-through' : 'text-zinc-950 dark:text-white'}`}>
                          {habit.name}
                        </h3>
                        <p className="text-xs text-zinc-400 dark:text-zinc-500 font-medium">
                          {getHabitRecurrenceLabel(recurrenceObj)} • {isDueToday ? `Due today` : `Available on scheduled days`} • Checked off {totalCompletions} time(s) total
                        </p>
                      </div>
                    </div>

                    {/* Streak HUD blocks */}
                    <div className="flex gap-4">
                      {/* Current streak */}
                      <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-500">
                        <Flame className="w-5 h-5 fill-current" />
                        <div>
                          <p className="text-[9px] uppercase font-bold tracking-wider leading-none text-zinc-400">Current Streak</p>
                          <p className="text-lg font-extrabold font-mono mt-0.5">{habit.streak} Days</p>
                        </div>
                      </div>

                      {/* Longest streak */}
                      <div className="flex items-center gap-2 p-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400">
                        <Award className="w-5 h-5" />
                        <div>
                          <p className="text-[9px] uppercase font-bold tracking-wider leading-none text-zinc-400">Longest Streak</p>
                          <p className="text-lg font-extrabold font-mono mt-0.5">{habit.longestStreak} Days</p>
                        </div>
                      </div>
                    </div>

                    {/* Delete button */}
                    <Button
                      onClick={() => handleConfirmDelete(habit._id)}
                      variant="ghost"
                      size="sm"
                      className="text-rose-500 hover:bg-rose-500/10 text-xs gap-1.5 h-8 px-2.5 mt-2 cursor-pointer border border-transparent hover:border-rose-500/20"
                      disabled={isPending}
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Remove tracker
                    </Button>
                  </div>

                  {/* Right Column: Calendar Contribution Heatmap */}
                  <div className="p-4 rounded-xl border border-border bg-zinc-50/50 dark:bg-zinc-950/20 self-start md:self-auto flex items-center justify-center">
                    {renderHeatmap(habit.completedDates)}
                  </div>

                </motion.div>
              )
            })
          )}
        </AnimatePresence>
      </div>

    </div>
  )
}
