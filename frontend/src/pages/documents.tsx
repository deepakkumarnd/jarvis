import { useEffect, useState } from 'react'
import { Lock, Plus, Search } from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { FileTypeIcon } from '@/components/file-type-icon'
import { PaginationBar } from '@/components/pagination-bar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { useDocuments } from '@/hooks/use-documents'
import { formatBytes, formatDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'

export function DocumentsPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const query = searchParams.get('q') ?? ''
  const page = Math.max(1, Number(searchParams.get('page')) || 1)
  const [searchInput, setSearchInput] = useState(query)
  const debouncedSearch = useDebouncedValue(searchInput.trim())
  const { data, isPending, isError, error, isPlaceholderData } = useDocuments({ query, page })

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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Documents</h1>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Lock className="size-3.5" />
            {data ? `${data.meta.total_count} ${query ? 'matching' : 'stored'} · encrypted at rest` : 'Encrypted at rest'}
          </p>
        </div>
        <Button asChild>
          <Link to="/documents/new">
            <Plus data-icon="inline-start" /> Upload documents
          </Link>
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search names and files…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="pl-8"
          aria-label="Search documents"
        />
      </div>

      <div className="rounded-lg border">
        <Table className={cn(isPlaceholderData && 'opacity-60')}>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Files</TableHead>
              <TableHead className="text-right">Size</TableHead>
              <TableHead className="hidden md:table-cell">Updated</TableHead>
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
              <EmptyRow>Couldn’t load documents: {error.message}</EmptyRow>
            ) : data.data.length === 0 ? (
              <EmptyRow>{query ? `No documents match “${query}”.` : 'No documents yet. Upload your first one.'}</EmptyRow>
            ) : (
              data.data.map((doc) => (
                <TableRow key={doc.id} className="cursor-pointer" onClick={() => navigate(`/documents/${doc.id}`)}>
                  <TableCell className="font-medium">
                    <Link to={`/documents/${doc.id}`} className="hover:underline" onClick={(e) => e.stopPropagation()}>
                      {doc.name}
                    </Link>
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <div className="flex items-center gap-2">
                      <span className="flex shrink-0 -space-x-1">
                        {doc.content_types.slice(0, 3).map((type) => (
                          <FileTypeIcon key={type} contentType={type} className="size-4 rounded-sm bg-background text-muted-foreground" />
                        ))}
                      </span>
                      <span className="truncate text-muted-foreground" title={doc.filenames.join(', ')}>
                        {doc.file_count === 1 ? doc.filenames[0] : `${doc.file_count} files · ${doc.filenames.slice(0, 2).join(', ')}${doc.file_count > 2 ? '…' : ''}`}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground tabular-nums">{formatBytes(doc.total_bytes)}</TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">{formatDateTime(doc.updated_at)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {data && <PaginationBar meta={data.meta} onPageChange={(p) => goTo({ page: p })} />}
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
