export type Severity = 'normal' | 'warning' | 'critical'

/** Maps a usage percentage to a severity: warning from 70%, critical from 90% by default. */
export function severityFor(percent: number, { warning = 70, critical = 90 } = {}): Severity {
  if (percent >= critical) return 'critical'
  if (percent >= warning) return 'warning'
  return 'normal'
}
