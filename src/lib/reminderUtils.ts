/**
 * Preset reminder times (in minutes before deadline)
 */
export const REMINDER_PRESETS = {
  '15_MINUTES': 15,
  '30_MINUTES': 30,
  '1_HOUR': 60,
  '2_HOURS': 120,
  '1_DAY': 1440,
  '2_DAYS': 2880,
  '1_WEEK': 10080,
  'CUSTOM': -1, // User provides custom value
}

/**
 * Get reminder configuration presets with labels
 */
export function getReminderPresets() {
  return [
    { label: '15 minutes', value: REMINDER_PRESETS['15_MINUTES'] },
    { label: '30 minutes', value: REMINDER_PRESETS['30_MINUTES'] },
    { label: '1 hour', value: REMINDER_PRESETS['1_HOUR'] },
    { label: '2 hours', value: REMINDER_PRESETS['2_HOURS'] },
    { label: '1 day', value: REMINDER_PRESETS['1_DAY'] },
    { label: '2 days', value: REMINDER_PRESETS['2_DAYS'] },
    { label: '1 week', value: REMINDER_PRESETS['1_WEEK'] },
  ]
}

/**
 * Format minutes to human-readable time
 */
export function formatMinutesToTime(minutes: number): string {
  if (minutes < 60) return `${minutes} minutes`
  if (minutes < 1440) return `${Math.floor(minutes / 60)} hour${Math.floor(minutes / 60) > 1 ? 's' : ''}`
  if (minutes < 10080) return `${Math.floor(minutes / 1440)} day${Math.floor(minutes / 1440) > 1 ? 's' : ''}`
  return `${Math.floor(minutes / 10080)} week${Math.floor(minutes / 10080) > 1 ? 's' : ''}`
}
