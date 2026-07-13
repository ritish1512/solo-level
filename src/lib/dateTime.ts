export function parseDateTimeLocalValue(value: string | Date | null | undefined): Date | null {
  if (!value) return null

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }

  if (typeof value !== 'string') return null

  const trimmed = value.trim()
  if (!trimmed) return null

  const datetimeLocalPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/
  if (datetimeLocalPattern.test(trimmed)) {
    const [datePart, timePart] = trimmed.split('T')
    const [year, month, day] = datePart.split('-').map(Number)
    const [hours, minutes] = timePart.split(':').map(Number)
    return new Date(year, month - 1, day, hours, minutes, 0, 0)
  }

  const parsed = new Date(trimmed)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function serializeDeadlineForApi(value: string | Date | null | undefined): string | null {
  const parsed = parseDateTimeLocalValue(value)
  return parsed ? parsed.toISOString() : null
}

export function formatLocalDateTime(date: Date | string | null | undefined): string {
  const parsed = parseDateTimeLocalValue(date)
  if (!parsed) return ''

  const year = parsed.getFullYear()
  const month = String(parsed.getMonth() + 1).padStart(2, '0')
  const day = String(parsed.getDate()).padStart(2, '0')
  const hours = String(parsed.getHours()).padStart(2, '0')
  const minutes = String(parsed.getMinutes()).padStart(2, '0')

  return `${year}-${month}-${day}T${hours}:${minutes}`
}
