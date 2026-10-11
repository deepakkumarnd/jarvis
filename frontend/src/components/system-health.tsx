import { useState, type ReactNode } from 'react'
import { Activity, CircleAlert, Cpu, Database, HardDrive, MemoryStick, Network, RefreshCw, Server } from 'lucide-react'
import { Meter, SeverityLabel } from '@/components/meter'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useBackendHealth } from '@/hooks/use-backend-health'
import type { CpuMetrics, HealthStatus, MemoryMetrics, SystemMetrics, ThroughputRates } from '@/lib/api'
import { formatBytes, formatCompact, formatDuration, formatRate } from '@/lib/format'
import { severityFor } from '@/lib/severity'

export function SystemHealthSection() {
  const { data: health, isPending, isError, error, refetch, isFetching } = useBackendHealth()

  return (
    <section className="space-y-4" aria-labelledby="system-health-heading">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 id="system-health-heading" className="font-heading text-lg font-semibold">
            System health
          </h2>
          <p className="text-sm text-muted-foreground">
            {health ? `Backend · last checked ${health.checkedAt.toLocaleTimeString()} · refreshes every 5s` : 'Backend health and host metrics'}
          </p>
        </div>
        {health && (
          <Badge className="gap-1 bg-emerald-600 text-white">
            <Activity /> Healthy
          </Badge>
        )}
      </div>

      {isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <CircleAlert className="size-4" /> Backend unreachable
            </CardTitle>
            <CardDescription>{error.message}</CardDescription>
            <CardAction>
              <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
                <RefreshCw data-icon="inline-start" className={isFetching ? 'animate-spin' : undefined} /> Retry
              </Button>
            </CardAction>
          </CardHeader>
        </Card>
      ) : (
        <HealthDetails health={health} />
      )}
    </section>
  )
}

function HealthDetails({ health }: { health: HealthStatus }) {
  const metrics = health.metrics

  if (!metrics) {
    return (
      <Card>
        <CardContent className="text-sm text-muted-foreground">
          Backend is healthy (database {health.database.latency_ms} ms). Host metrics aren’t exposed by this server.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <KpiRow metrics={metrics} />
      <div className="grid gap-4 lg:grid-cols-2">
        {metrics.cpu && <CpuCard cpu={metrics.cpu} />}
        {metrics.memory && <MemoryCard memory={metrics.memory} />}
      </div>
      {metrics.disk && <StorageCard disk={metrics.disk} rates={health.rates?.disk} />}
      {metrics.network && <NetworkCard interfaces={metrics.network} rates={health.rates?.network} />}
      <div className="grid gap-4 lg:grid-cols-2">
        {metrics.host && <HostCard host={metrics.host} />}
        <ProcessCard process={metrics.process} health={health} />
      </div>
    </div>
  )
}

// --- Headline numbers ---------------------------------------------------------

function KpiRow({ metrics }: { metrics: SystemMetrics }) {
  const { cpu, memory, disk } = metrics
  const rootFs = disk?.filesystems[0]
  const loadPerCore = cpu ? (cpu.load_average['1m'] / cpu.logical_cores) * 100 : 0

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cpu && (
        <StatTile label="CPU usage" value={`${cpu.usage_percent.toFixed(1)}%`} percent={cpu.usage_percent} sub={`${cpu.logical_cores} logical cores`} />
      )}
      {memory && (
        <StatTile
          label="Memory used"
          value={`${memory.used_percent.toFixed(1)}%`}
          percent={memory.used_percent}
          sub={`${formatBytes(memory.used_bytes)} of ${formatBytes(memory.total_bytes)}`}
        />
      )}
      {rootFs && (
        <StatTile
          label={`Disk used (${rootFs.mount})`}
          value={`${rootFs.used_percent.toFixed(1)}%`}
          percent={rootFs.used_percent}
          sub={`${formatBytes(rootFs.free_bytes)} free of ${formatBytes(rootFs.total_bytes)}`}
        />
      )}
      {cpu && (
        <StatTile
          label="Load average (1m)"
          value={cpu.load_average['1m'].toFixed(2)}
          percent={loadPerCore}
          sub={`${loadPerCore.toFixed(0)}% of ${cpu.logical_cores} cores`}
        />
      )}
    </div>
  )
}

function StatTile({ label, value, percent, sub }: { label: string; value: string; percent: number; sub: string }) {
  const severity = severityFor(percent)
  return (
    <Card size="sm">
      <CardContent className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm text-muted-foreground">{label}</p>
          <SeverityLabel severity={severity} />
        </div>
        <p className="text-2xl font-semibold tracking-tight">{value}</p>
        <Meter value={percent} label={label} detail={sub} severity={severity} />
        <p className="text-xs text-muted-foreground">{sub}</p>
      </CardContent>
    </Card>
  )
}

// --- Detail cards -------------------------------------------------------------

function SectionCard({ icon, title, description, children }: { icon: ReactNode; title: string; description?: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {icon} {title}
        </CardTitle>
        {description && <CardDescription className="break-words">{description}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

function Facts({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3">
      {items.map(([term, value]) => (
        <div key={term} className="min-w-0">
          <dt className="text-muted-foreground">{term}</dt>
          <dd className="font-medium break-words">
            {value}
          </dd>
        </div>
      ))}
    </dl>
  )
}

function CpuCard({ cpu }: { cpu: CpuMetrics }) {
  return (
    <SectionCard icon={<Cpu className="size-4" />} title="CPU" description={cpu.model ?? undefined}>
      <div className="space-y-5">
        <Facts
          items={[
            ['Physical cores', cpu.physical_cores ?? '—'],
            ['Logical cores', cpu.logical_cores],
            ['Clock', cpu.mhz ? `${(cpu.mhz / 1000).toFixed(2)} GHz` : '—'],
            ['Load 1m', cpu.load_average['1m'].toFixed(2)],
            ['Load 5m', cpu.load_average['5m'].toFixed(2)],
            ['Load 15m', cpu.load_average['15m'].toFixed(2)],
          ]}
        />
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Usage per core</p>
          <div className="grid grid-cols-4 gap-x-3 gap-y-2 sm:grid-cols-8">
            {cpu.per_core_usage_percent.map((usage, i) => (
              <div key={i} className="space-y-1">
                <Meter value={usage} label={`Core ${i}`} className="h-1.5" />
                <p className="text-[11px] text-muted-foreground tabular-nums">
                  {i} · {usage.toFixed(0)}%
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </SectionCard>
  )
}

function MeterRow({ label, percent, detail }: { label: string; percent: number; detail: string }) {
  const severity = severityFor(percent)
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="flex items-center gap-2">
          {label} <SeverityLabel severity={severity} />
        </span>
        <span className="text-muted-foreground tabular-nums">
          {detail} · {percent.toFixed(1)}%
        </span>
      </div>
      <Meter value={percent} label={label} detail={detail} severity={severity} />
    </div>
  )
}

function MemoryCard({ memory }: { memory: MemoryMetrics }) {
  const { swap } = memory
  return (
    <SectionCard icon={<MemoryStick className="size-4" />} title="Memory" description={`${formatBytes(memory.total_bytes)} total`}>
      <div className="space-y-5">
        <MeterRow label="RAM" percent={memory.used_percent} detail={`${formatBytes(memory.used_bytes)} of ${formatBytes(memory.total_bytes)}`} />
        {swap.total_bytes > 0 && (
          <MeterRow label="Swap" percent={swap.used_percent} detail={`${formatBytes(swap.used_bytes)} of ${formatBytes(swap.total_bytes)}`} />
        )}
        <Facts
          items={[
            ['Available', formatBytes(memory.available_bytes)],
            ['Free', formatBytes(memory.free_bytes)],
            ['Used', formatBytes(memory.used_bytes)],
            ['Cached', formatBytes(memory.cached_bytes)],
            ['Buffers', formatBytes(memory.buffers_bytes)],
            ['Swap free', formatBytes(swap.free_bytes)],
          ]}
        />
      </div>
    </SectionCard>
  )
}

function StorageCard({ disk, rates }: { disk: NonNullable<SystemMetrics['disk']>; rates?: ThroughputRates['disk'] }) {
  return (
    <SectionCard icon={<HardDrive className="size-4" />} title="Storage" description="Filesystem usage and block device I/O">
      <div className="space-y-5">
        {disk.filesystems.map((fs) => (
          <MeterRow
            key={fs.filesystem}
            label={`${fs.mount} (${fs.filesystem})`}
            percent={fs.used_percent}
            detail={`${formatBytes(fs.used_bytes)} of ${formatBytes(fs.total_bytes)}`}
          />
        ))}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Device</TableHead>
              <TableHead className="text-right">Read/s</TableHead>
              <TableHead className="text-right">Write/s</TableHead>
              <TableHead className="text-right">Total read</TableHead>
              <TableHead className="text-right">Total written</TableHead>
              <TableHead className="hidden text-right sm:table-cell">Reads / writes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="tabular-nums">
            {disk.devices.map((d) => (
              <TableRow key={d.name}>
                <TableCell className="font-medium">{d.name}</TableCell>
                <TableCell className="text-right">{formatRate(rates?.[d.name]?.read)}</TableCell>
                <TableCell className="text-right">{formatRate(rates?.[d.name]?.write)}</TableCell>
                <TableCell className="text-right">{formatBytes(d.read_bytes)}</TableCell>
                <TableCell className="text-right">{formatBytes(d.written_bytes)}</TableCell>
                <TableCell className="hidden text-right text-muted-foreground sm:table-cell">
                  {formatCompact(d.reads)} / {formatCompact(d.writes)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!rates && <p className="text-xs text-muted-foreground">Rates appear after the next sample.</p>}
      </div>
    </SectionCard>
  )
}

function NetworkCard({ interfaces, rates }: { interfaces: NonNullable<SystemMetrics['network']>; rates?: ThroughputRates['network'] }) {
  const [showVirtual, setShowVirtual] = useState(false)
  const virtualCount = interfaces.filter((i) => i.virtual && !i.loopback).length
  const visible = interfaces.filter((i) => showVirtual || !i.virtual || i.loopback)

  return (
    <SectionCard icon={<Network className="size-4" />} title="Network" description="Interfaces, addresses and traffic">
      <div className="space-y-3">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Interface</TableHead>
              <TableHead>Addresses</TableHead>
              <TableHead className="text-right">Receive/s</TableHead>
              <TableHead className="text-right">Send/s</TableHead>
              <TableHead className="text-right">Received</TableHead>
              <TableHead className="text-right">Sent</TableHead>
              <TableHead className="hidden text-right md:table-cell">Errors</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="tabular-nums">
            {visible.map((n) => (
              <TableRow key={n.name}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{n.name}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {n.loopback ? 'loopback' : (n.state ?? 'unknown')}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {[n.mac, n.speed_mbps && `${n.speed_mbps} Mb/s`, n.mtu && `MTU ${n.mtu}`].filter(Boolean).join(' · ')}
                  </p>
                </TableCell>
                <TableCell className="max-w-56 font-mono text-xs">
                  {n.addresses.length ? n.addresses.map((a) => <div key={a.address} className="truncate">{a.address}</div>) : <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell className="text-right">{formatRate(rates?.[n.name]?.rx)}</TableCell>
                <TableCell className="text-right">{formatRate(rates?.[n.name]?.tx)}</TableCell>
                <TableCell className="text-right">{formatBytes(n.rx_bytes)}</TableCell>
                <TableCell className="text-right">{formatBytes(n.tx_bytes)}</TableCell>
                <TableCell className="hidden text-right text-muted-foreground md:table-cell">
                  {n.rx_errors + n.tx_errors + n.rx_dropped + n.tx_dropped}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {virtualCount > 0 && (
          <Button variant="ghost" size="sm" onClick={() => setShowVirtual((v) => !v)}>
            {showVirtual ? 'Hide' : 'Show'} {virtualCount} virtual {virtualCount === 1 ? 'interface' : 'interfaces'} (bridges, veth)
          </Button>
        )}
      </div>
    </SectionCard>
  )
}

function HostCard({ host }: { host: NonNullable<SystemMetrics['host']> }) {
  return (
    <SectionCard icon={<Server className="size-4" />} title="Host" description={host.hostname}>
      <Facts
        items={[
          ['OS', host.os],
          ['Kernel', host.kernel],
          ['Architecture', host.architecture],
          ['Uptime', formatDuration(host.uptime_seconds)],
          ['Booted', new Date(host.booted_at).toLocaleString()],
        ]}
      />
    </SectionCard>
  )
}

function ProcessCard({ process, health }: { process: SystemMetrics['process']; health: HealthStatus }) {
  return (
    <SectionCard icon={<Database className="size-4" />} title="Backend process" description={process ? `Rails ${process.rails_version} · Ruby ${process.ruby_version}` : undefined}>
      <Facts
        items={[
          ['Response time', `${health.latencyMs} ms`],
          ['Database', `OK · ${health.database.latency_ms} ms`],
          ...(process
            ? ([
                ['Environment', process.environment],
                ['PID', process.pid],
                ['Memory (RSS)', formatBytes(process.rss_bytes)],
                ['Threads', process.threads],
                ['Uptime', process.uptime_seconds === null ? '—' : formatDuration(process.uptime_seconds)],
                ['CPU time', `${process.cpu_time_seconds.toFixed(1)} s`],
              ] as [string, ReactNode][])
            : []),
        ]}
      />
    </SectionCard>
  )
}
