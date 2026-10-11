import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, ExternalLink, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { useSearchParams } from 'react-router'
import { BookmarkFormDialog } from '@/components/bookmark-form-dialog'
import { DeleteBookmarkDialog } from '@/components/delete-bookmark-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useBookmarks } from '@/hooks/use-bookmarks'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import type { Bookmark, PaginationMeta } from '@/lib/api'

export function BookmarksPage() {
  // Search query and page live in the URL (?q=&page=) so they survive reloads and back/forward
  const [searchParams, setSearchParams] = useSearchParams()
  const query = searchParams.get('q') ?? ''
  const page = Math.max(1, Number(searchParams.get('page')) || 1)

  const [searchInput, setSearchInput] = useState(query)
  const debouncedSearch = useDebouncedValue(searchInput.trim())

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Bookmark>()
  const [deleting, setDeleting] = useState<Bookmark>()

  const { data, isPending, isError, error, isPlaceholderData } = useBookmarks({ query, page })

  function goTo(params: { q?: string; page?: number }) {
    const next = new URLSearchParams()
    const q = params.q ?? query
    const p = params.page ?? page
    if (q) next.set('q', q)
    if (p > 1) next.set('page', String(p))
    setSearchParams(next, { replace: params.q !== undefined })
  }

  // Apply the debounced search, starting again from page 1
  useEffect(() => {
    if (debouncedSearch !== query) goTo({ q: debouncedSearch, page: 1 })
  }, [debouncedSearch]) // eslint-disable-line react-hooks/exhaustive-deps

  // After deleting the last bookmark on the last page, step back to the new last page
  useEffect(() => {
    if (data && data.data.length === 0 && page > 1 && data.meta.total_pages > 0) goTo({ page: data.meta.total_pages })
  }, [data]) // eslint-disable-line react-hooks/exhaustive-deps

  function openCreate() {
    setEditing(undefined)
    setFormOpen(true)
  }

  function openEdit(bookmark: Bookmark) {
    setEditing(bookmark)
    setFormOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Bookmarks</h1>
          <p className="text-sm text-muted-foreground">
            {data ? `${data.meta.total_count} ${query ? 'matching' : 'saved'}` : 'Your saved links'}
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus data-icon="inline-start" /> New bookmark
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search by name…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="pl-8"
          aria-label="Search bookmarks by name"
        />
      </div>

      <div className="rounded-lg border">
        <Table className={isPlaceholderData ? 'opacity-60' : undefined}>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Link</TableHead>
              <TableHead className="hidden sm:table-cell">Added</TableHead>
              <TableHead className="w-24 text-right">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending ? (
              Array.from({ length: 5 }, (_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={4}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : isError ? (
              <EmptyRow>Couldn’t load bookmarks: {error.message}</EmptyRow>
            ) : data.data.length === 0 ? (
              <EmptyRow>{query ? `No bookmarks match “${query}”.` : 'No bookmarks yet. Add your first one.'}</EmptyRow>
            ) : (
              data.data.map((bookmark) => (
                <TableRow key={bookmark.id}>
                  <TableCell className="font-medium">{bookmark.name}</TableCell>
                  <TableCell className="max-w-xs">
                    <a
                      href={bookmark.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex max-w-full items-center gap-1 text-muted-foreground hover:text-foreground hover:underline"
                    >
                      <span className="truncate">{bookmark.link}</span>
                      <ExternalLink className="size-3 shrink-0" />
                    </a>
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">
                    {new Date(bookmark.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon-sm" onClick={() => openEdit(bookmark)} aria-label={`Edit ${bookmark.name}`}>
                      <Pencil />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setDeleting(bookmark)}
                      aria-label={`Delete ${bookmark.name}`}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {data && data.meta.total_pages > 1 && <Pagination meta={data.meta} onPageChange={(p) => goTo({ page: p })} />}

      <BookmarkFormDialog open={formOpen} onOpenChange={setFormOpen} bookmark={editing} />
      <DeleteBookmarkDialog bookmark={deleting} onOpenChange={(open) => !open && setDeleting(undefined)} />
    </div>
  )
}

function EmptyRow({ children }: { children: React.ReactNode }) {
  return (
    <TableRow>
      <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
        {children}
      </TableCell>
    </TableRow>
  )
}

function Pagination({ meta, onPageChange }: { meta: PaginationMeta; onPageChange: (page: number) => void }) {
  const first = (meta.page - 1) * meta.per_page + 1
  const last = Math.min(meta.page * meta.per_page, meta.total_count)

  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <p className="text-muted-foreground">
        Showing {first}–{last} of {meta.total_count}
      </p>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={meta.page <= 1} onClick={() => onPageChange(meta.page - 1)}>
          <ChevronLeft data-icon="inline-start" /> Previous
        </Button>
        <span className="tabular-nums">
          Page {meta.page} of {meta.total_pages}
        </span>
        <Button variant="outline" size="sm" disabled={meta.page >= meta.total_pages} onClick={() => onPageChange(meta.page + 1)}>
          Next <ChevronRight data-icon="inline-end" />
        </Button>
      </div>
    </div>
  )
}
