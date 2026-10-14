import { Settings } from 'lucide-react'
import { Link, NavLink, Outlet } from 'react-router'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useBrand } from '@/hooks/use-brand'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/bookmarks', label: 'Bookmarks', end: false },
  { to: '/notes', label: 'Notes', end: false },
  { to: '/todos', label: 'Todos', end: false },
  { to: '/documents', label: 'Documents', end: false },
  { to: '/credentials', label: 'Credentials', end: false },
]

export function Layout() {
  return (
    <div className="min-h-svh bg-background">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-6 px-4">
          <Brand />
          {/* Scrolls sideways on narrow screens instead of widening the page */}
          <nav className="-mx-1 flex min-w-0 items-center gap-4 overflow-x-auto px-1 text-sm whitespace-nowrap">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn('text-muted-foreground transition-colors hover:text-foreground', isActive && 'text-foreground font-medium')
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <Button asChild variant="ghost" size="icon-sm" className="ml-auto shrink-0">
            <NavLink to="/settings" aria-label="Settings" title="Settings">
              <Settings />
            </NavLink>
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}

/** Brand name and tagline from the settings record (fallback until available). */
function Brand() {
  const { brandName, tagline, loading } = useBrand()

  if (loading) return <Skeleton className="h-5 w-20 shrink-0" />

  return (
    <Link to="/" className="flex shrink-0 flex-col leading-tight" aria-label={`${brandName} home`}>
      <span className="font-heading text-base font-semibold">{brandName}</span>
      {tagline && <span className="hidden text-[11px] text-muted-foreground md:block">{tagline}</span>}
    </Link>
  )
}
