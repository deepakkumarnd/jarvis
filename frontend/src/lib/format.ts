const dateTime = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })

export function formatDateTime(iso: string) {
  return dateTime.format(new Date(iso))
}

/** Parses an ISO date (YYYY-MM-DD) as a local calendar date, avoiding UTC day shifts. */
export function parseLocalDate(isoDate: string) {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Date(year, month - 1, day)
}

/** Whole days from today until the given ISO date (negative when in the past). */
export function daysFromToday(isoDate: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((parseLocalDate(isoDate).getTime() - today.getTime()) / 86_400_000)
}

const shortDate = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' })
const shortDateWithYear = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' })

export function formatDueDate(isoDate: string) {
  const days = daysFromToday(isoDate)
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  if (days === -1) return 'Yesterday'
  const date = parseLocalDate(isoDate)
  return (date.getFullYear() === new Date().getFullYear() ? shortDate : shortDateWithYear).format(date)
}

const byteUnits = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB']

/** 1536 -> "1.5 KiB" (binary units, as the kernel reports them) */
export function formatBytes(bytes: number, fractionDigits = 1) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), byteUnits.length - 1)
  const value = bytes / 1024 ** exponent
  return `${value.toFixed(exponent === 0 ? 0 : value >= 100 ? 0 : fractionDigits)} ${byteUnits[exponent]}`
}

export function formatRate(bytesPerSecond: number | undefined) {
  return bytesPerSecond === undefined ? '—' : `${formatBytes(bytesPerSecond)}/s`
}

/** 93784 -> "1d 2h 3m" */
export function formatDuration(totalSeconds: number) {
  const days = Math.floor(totalSeconds / 86_400)
  const hours = Math.floor((totalSeconds % 86_400) / 3_600)
  const minutes = Math.floor((totalSeconds % 3_600) / 60)
  if (days) return `${days}d ${hours}h ${minutes}m`
  if (hours) return `${hours}h ${minutes}m`
  if (minutes) return `${minutes}m`
  return `${Math.floor(totalSeconds)}s`
}

const compact = new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 })

/** 12900 -> "12.9K" */
export function formatCompact(value: number) {
  return compact.format(value)
}
