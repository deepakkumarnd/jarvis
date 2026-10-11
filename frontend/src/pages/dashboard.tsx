import { ArrowRight, Bookmark, CircleAlert, RefreshCw, Server } from 'lucide-react'
import { Link } from 'react-router'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useBackendHealth } from '@/hooks/use-backend-health'

export function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">System status and quick links.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <BackendHealthCard />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bookmark className="size-4" /> Bookmarks
            </CardTitle>
            <CardDescription>Save, search and organise your links.</CardDescription>
          </CardHeader>
          <CardContent className="mt-auto">
            <Button asChild>
              <Link to="/bookmarks">
                Open bookmarks <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function BackendHealthCard() {
  const { data: health, isPending, isError, error, refetch, isFetching } = useBackendHealth()

  if (isPending) return <Skeleton className="h-40 rounded-xl" />

  if (isError) {
    return (
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <CircleAlert className="size-4" /> Backend unreachable
          </CardTitle>
          <CardDescription>{error.message}</CardDescription>
        </CardHeader>
        <CardFooter>
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw data-icon="inline-start" className={isFetching ? 'animate-spin' : undefined} /> Retry
          </Button>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Server className="size-4" /> Backend
        </CardTitle>
        <CardDescription>Rails API health check</CardDescription>
        <CardAction>
          <Badge className="bg-emerald-600 text-white">Healthy</Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-3 gap-2 text-sm">
          <div>
            <dt className="text-muted-foreground">Endpoint</dt>
            <dd className="font-mono">/up</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Status</dt>
            <dd>{health.status}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Latency</dt>
            <dd>{health.latencyMs} ms</dd>
          </div>
        </dl>
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground">
        Last checked {health.checkedAt.toLocaleTimeString()} · refreshes every 30s
      </CardFooter>
    </Card>
  )
}
