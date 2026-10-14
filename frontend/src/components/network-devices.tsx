import { Cable, CircleAlert, RefreshCw, Router, Server, Wifi } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useNetworkDevices, useRescanNetwork } from '@/hooks/use-network-devices'
import type { NetworkScan } from '@/lib/api'

export function NetworkDevicesSection() {
  const { data: scan, isPending, isError, error, isFetching } = useNetworkDevices()
  const rescan = useRescanNetwork()
  const scanning = isFetching || rescan.isPending
  const failure = rescan.error ?? (isError ? error : null)

  return (
    <section className="space-y-4" aria-labelledby="network-devices-heading">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="network-devices-heading" className="font-heading text-lg font-semibold">
              Network devices
            </h2>
            {scan?.networks.map((n) => (
              <Badge key={n.interface} variant="secondary" title={`Connected via ${n.interface}`}>
                {n.ssid ? <Wifi data-icon="inline-start" /> : <Cable data-icon="inline-start" />} {n.ssid ?? n.interface}
              </Badge>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">{scan ? summary(scan) : 'Devices connected to your local network'}</p>
        </div>
        <Button variant="outline" onClick={() => rescan.mutate()} disabled={scanning}>
          <RefreshCw data-icon="inline-start" className={scanning ? 'animate-spin' : undefined} /> {scanning ? 'Scanning…' : 'Scan now'}
        </Button>
      </div>

      {failure && (
        <Card className="border-destructive/50">
          <CardContent className="flex items-center gap-2 text-sm text-destructive">
            <CircleAlert className="size-4" /> {failure.message}
          </CardContent>
        </Card>
      )}

      {isPending ? (
        <Skeleton className="h-48 rounded-xl" />
      ) : scan ? (
        <DevicesTable scan={scan} />
      ) : null}
    </section>
  )
}

function summary(scan: NetworkScan) {
  const count = `${scan.devices.length} ${scan.devices.length === 1 ? 'device' : 'devices'}`
  const networks = scan.networks.map((n) => n.cidr).join(', ')
  return `${count}${networks ? ` on ${networks}` : ''} · scanned ${new Date(scan.scanned_at).toLocaleTimeString()} · refreshes every minute`
}

function DevicesTable({ scan }: { scan: NetworkScan }) {
  if (scan.networks.length === 0) {
    return (
      <Card>
        <CardContent className="text-sm text-muted-foreground">No local network found: the server has no connected Wi-Fi or Ethernet interface.</CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="space-y-3">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Device</TableHead>
              <TableHead>IP address</TableHead>
              <TableHead>MAC address</TableHead>
              <TableHead className="hidden md:table-cell">Vendor</TableHead>
              {scan.networks.length > 1 && <TableHead className="hidden md:table-cell">Interface</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {scan.devices.map((d) => (
              <TableRow key={d.ip}>
                <TableCell>
                  <div className="flex flex-wrap items-center gap-2">
                    <DeviceIcon gateway={d.gateway} self={d.self} />
                    <span className={d.hostname ? 'font-medium' : 'text-muted-foreground'}>{d.hostname ?? 'Unknown device'}</span>
                    {d.gateway && <Badge variant="secondary">Router</Badge>}
                    {d.self && <Badge variant="secondary">This server</Badge>}
                    {d.randomized && (
                      <Badge variant="outline" title="Locally administered address, e.g. a phone's private Wi-Fi address">
                        Private MAC
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="font-mono text-xs tabular-nums">{d.ip}</TableCell>
                <TableCell className="font-mono text-xs">{d.mac}</TableCell>
                <TableCell className="hidden text-muted-foreground md:table-cell">{d.vendor ?? '—'}</TableCell>
                {scan.networks.length > 1 && <TableCell className="hidden text-muted-foreground md:table-cell">{d.interface}</TableCell>}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <p className="text-xs text-muted-foreground">Devices that are asleep (e.g. phones in standby) may not appear until they wake.</p>
      </CardContent>
    </Card>
  )
}

function DeviceIcon({ gateway, self }: { gateway: boolean; self: boolean }) {
  const Icon = gateway ? Router : self ? Server : Wifi
  return <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
}
