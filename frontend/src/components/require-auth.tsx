import type { ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { Navigate, useLocation } from 'react-router'
import { useSession } from '@/hooks/use-session'

/** Renders its children only for a signed-in user; otherwise redirects to /login and comes back afterwards. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { data, isPending, isError, error } = useSession()
  const location = useLocation()

  if (isPending) {
    return (
      <div className="flex min-h-svh items-center justify-center" role="status" aria-label="Loading">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    )
  }
  if (isError) return <p className="p-8 text-sm text-destructive">Couldn’t reach the server: {error.message}</p>
  if (!data.signedIn) {
    const next = location.pathname + location.search
    return <Navigate to={next === '/' ? '/login' : `/login?next=${encodeURIComponent(next)}`} replace />
  }
  return children
}
