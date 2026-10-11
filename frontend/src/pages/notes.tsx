import { Plus } from 'lucide-react'
import { Link, useSearchParams } from 'react-router'
import { Markdown } from '@/components/markdown'
import { PaginationBar } from '@/components/pagination-bar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useNotes } from '@/hooks/use-notes'
import type { NoteSummary } from '@/lib/api'
import { formatDateTime } from '@/lib/format'

export function NotesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const page = Math.max(1, Number(searchParams.get('page')) || 1)
  const { data, isPending, isError, error, isPlaceholderData } = useNotes(page)

  function goToPage(p: number) {
    setSearchParams(p > 1 ? { page: String(p) } : {})
    window.scrollTo({ top: 0 })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Notes</h1>
          <p className="text-sm text-muted-foreground">{data ? `${data.meta.total_count} notes` : 'Markdown notes'}</p>
        </div>
        <Button asChild>
          <Link to="/notes/new">
            <Plus data-icon="inline-start" /> New note
          </Link>
        </Button>
      </div>

      {isPending ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-72 rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <p className="text-sm text-destructive">Couldn’t load notes: {error.message}</p>
      ) : data.data.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center">
          <p className="text-muted-foreground">No notes yet.</p>
          <Button asChild variant="outline" className="mt-4">
            <Link to="/notes/new">Write your first note</Link>
          </Button>
        </div>
      ) : (
        <div className={`grid gap-4 md:grid-cols-2 ${isPlaceholderData ? 'opacity-60' : ''}`}>
          {data.data.map((note) => (
            <NoteCard key={note.id} note={note} />
          ))}
        </div>
      )}

      {data && <PaginationBar meta={data.meta} onPageChange={goToPage} />}
    </div>
  )
}

function NoteCard({ note }: { note: NoteSummary }) {
  return (
    <Link to={`/notes/${note.id}`} className="group rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
      <Card className="h-full transition-colors group-hover:border-foreground/20">
        <CardHeader>
          <CardTitle className="line-clamp-1 text-lg">{note.title}</CardTitle>
          <CardDescription>Updated {formatDateTime(note.updated_at)}</CardDescription>
        </CardHeader>
        <CardContent>
          {note.preview.trim() ? (
            // Large rendered preview, faded out at the bottom
            <div className="max-h-56 overflow-hidden mask-b-from-70%">
              <Markdown className="prose-sm" disableLinks>
                {note.preview}
              </Markdown>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">Empty note</p>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
