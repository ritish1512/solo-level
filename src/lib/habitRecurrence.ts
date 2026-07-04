export type HabitRecurrenceType = 'daily' | 'weekdays' | 'weekends' | 'custom-days' | 'monthly-start' | 'monthly-end'

export interface HabitRecurrence {
  type: HabitRecurrenceType
  days?: string[]
}

export const HABIT_RECURRENCE_DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const

export const HABIT_RECURRENCE_LABELS: Record<HabitRecurrenceType, string> = {
  daily: 'Every day',
  weekdays: 'Weekdays',
  weekends: 'Weekends',
  'custom-days': 'Custom days',
  'monthly-start': 'Every start of month',
  'monthly-end': 'Every end of month',
}

export function normalizeHabitRecurrence(recurrence?: any | null): HabitRecurrence {
  const rawType = (recurrence?.type ?? recurrence?.recurrenceType ?? 'daily') as string
  const normalizedType = rawType === 'weekends' || rawType === 'weekdays' || rawType === 'daily' || rawType === 'custom-days' || rawType === 'monthly-start' || rawType === 'monthly-end'
    ? rawType
    : 'daily'

  const rawDays = recurrence?.days ?? recurrence?.recurrenceDays ?? []
  const days = Array.isArray(rawDays)
    ? rawDays.filter((day) => HABIT_RECURRENCE_DAYS.includes(day as (typeof HABIT_RECURRENCE_DAYS)[number]))
    : []

  return {
    type: normalizedType as HabitRecurrenceType,
    days,
  }
}

export function formatLocalDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function parseLocalDate(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function getHabitRecurrenceLabel(recurrence?: HabitRecurrence | null): string {
  const normalized = normalizeHabitRecurrence(recurrence)

  if (normalized.type === 'custom-days' && normalized.days?.length) {
    return normalized.days.map((day) => day.toUpperCase()).join(', ')
  }

  return HABIT_RECURRENCE_LABELS[normalized.type]
}

export function isHabitDueForDate(recurrence: HabitRecurrence | null | undefined, date: Date = new Date()): boolean {
  const normalized = normalizeHabitRecurrence(recurrence)
  const dayIndex = date.getDay()
  const dayKey = HABIT_RECURRENCE_DAYS[dayIndex]

  switch (normalized.type) {
    case 'weekdays':
      return dayIndex >= 1 && dayIndex <= 5
    case 'weekends':
      return dayIndex === 0 || dayIndex === 6
    case 'custom-days':
      return normalized.days?.includes(dayKey) ?? false
    case 'monthly-start':
      return date.getDate() === 1
    case 'monthly-end':
      return date.getDate() === new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
    case 'daily':
    default:
      return true
  }
}

export function getHabitDueDatesBetween(
  recurrence: HabitRecurrence | null | undefined,
  startDate: Date,
  endDate: Date
): string[] {
  const normalized = normalizeHabitRecurrence(recurrence)
  const dates: string[] = []
  const current = new Date(startDate)
  current.setHours(0, 0, 0, 0)

  const end = new Date(endDate)
  end.setHours(0, 0, 0, 0)

  while (current <= end) {
    if (isHabitDueForDate(normalized, current)) {
      const dateString = formatLocalDate(current)
      dates.push(dateString)
    }
    current.setDate(current.getDate() + 1)
  }

  return dates
}
