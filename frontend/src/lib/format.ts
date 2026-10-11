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
