import { CircleAlert, TriangleAlert } from 'lucide-react'
import { severityFor, type Severity } from '@/lib/severity'
import { cn } from '@/lib/utils'

// The track is a lighter step of the fill's own hue so state reads across the whole bar
const fill: Record<Severity, string> = {
  normal: 'bg-meter-normal',
  warning: 'bg-meter-warning',
  critical: 'bg-meter-critical',
}
const track: Record<Severity, string> = {
  normal: 'bg-meter-normal/15',
  warning: 'bg-meter-warning/20',
  critical: 'bg-meter-critical/15',
}

type MeterProps = {
  /** 0–100 */
  value: number
  label: string
  /** Shown on hover, e.g. "11.0 GiB of 15.5 GiB" */
  detail?: string
  severity?: Severity
  className?: string
}

export function Meter({ value, label, detail, severity = severityFor(value), className }: MeterProps) {
  const clamped = Math.min(100, Math.max(0, value))
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped)}
      aria-valuetext={`${clamped.toFixed(1)}%${detail ? `, ${detail}` : ''}`}
      title={`${label}: ${clamped.toFixed(1)}%${detail ? ` · ${detail}` : ''}`}
      className={cn('h-2 w-full overflow-hidden rounded-full', track[severity], className)}
    >
      <div className={cn('h-full rounded-full transition-[width] duration-500', fill[severity])} style={{ width: `${clamped}%` }} />
    </div>
  )
}

/** Icon + word for elevated states, so severity is never conveyed by colour alone. */
export function SeverityLabel({ severity }: { severity: Severity }) {
  if (severity === 'normal') return null
  const Icon = severity === 'critical' ? CircleAlert : TriangleAlert
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-foreground">
      <Icon className={cn('size-3.5', severity === 'critical' ? 'text-meter-critical' : 'text-meter-warning')} aria-hidden />
      {severity === 'critical' ? 'Critical' : 'High'}
    </span>
  )
}
