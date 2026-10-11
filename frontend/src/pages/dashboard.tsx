import { ArrowRight, Bookmark, ListTodo, NotebookPen } from 'lucide-react'
import { Link } from 'react-router'
import { SystemHealthSection } from '@/components/system-health'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useTodos } from '@/hooks/use-todos'

export function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Your apps and how the system is doing.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <NotebookPen className="size-4" /> Notes
            </CardTitle>
            <CardDescription>Write and read Markdown notes.</CardDescription>
          </CardHeader>
          <CardContent className="mt-auto">
            <Button asChild>
              <Link to="/notes">
                Open notes <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <TodosCard />
      </div>

      <SystemHealthSection />
    </div>
  )
}

function TodosCard() {
  const { data } = useTodos('active', 1)
  const open = data?.meta.counts.active

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ListTodo className="size-4" /> Todos
        </CardTitle>
        <CardDescription>{open === undefined ? 'Track what needs doing.' : open === 0 ? 'All caught up.' : `${open} open ${open === 1 ? 'todo' : 'todos'}.`}</CardDescription>
      </CardHeader>
      <CardContent className="mt-auto">
        <Button asChild>
          <Link to="/todos">
            Open todos <ArrowRight data-icon="inline-end" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}
