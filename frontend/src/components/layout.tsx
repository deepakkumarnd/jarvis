import { NavLink, Outlet } from 'react-router'
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
          <span className="shrink-0 font-heading text-base font-semibold">Jarvis</span>
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
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}
