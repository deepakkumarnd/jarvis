import { useEffect, useState, type FormEvent } from 'react'
import { Lock, Plus, Search } from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { CredentialKindIcon } from '@/components/credential-kind-icon'
import { PaginationBar } from '@/components/pagination-bar'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useCreateCredentialGroup, useCredentialGroups } from '@/hooks/use-credentials'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { ApiError } from '@/lib/api'
import { formatDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'

export function CredentialsPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const query = searchParams.get('q') ?? ''
  const page = Math.max(1, Number(searchParams.get('page')) || 1)
  const [searchInput, setSearchInput] = useState(query)
  const debouncedSearch = useDebouncedValue(searchInput.trim())
  const { data, isPending, isError, error, isPlaceholderData } = useCredentialGroups({ query, page })

  function goTo(params: { q?: string; page?: number }) {
    const next = new URLSearchParams()
    const q = params.q ?? query
    const p = params.page ?? page
    if (q) next.set('q', q)
    if (p > 1) next.set('page', String(p))
    setSearchParams(next, { replace: params.q !== undefined })
  }

  useEffect(() => {
    if (debouncedSearch !== query) goTo({ q: debouncedSearch, page: 1 })
  }, [debouncedSearch]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Credentials</h1>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Lock className="size-3.5" />
            {data ? `${data.meta.total_count} ${query ? 'matching groups' : data.meta.total_count === 1 ? 'group' : 'groups'} · encrypted at rest` : 'Encrypted at rest'}
          </p>
        </div>
        <NewGroupDialog />
      </div>

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search groups and credential names…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="pl-8"
          aria-label="Search credentials"
        />
      </div>

      <div className="rounded-lg border">
        <Table className={cn(isPlaceholderData && 'opacity-60')}>
          <TableHeader>
            <TableRow>
              <TableHead>Group</TableHead>
              <TableHead>Credentials</TableHead>
              <TableHead className="hidden md:table-cell">Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending ? (
              Array.from({ length: 4 }, (_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={3}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : isError ? (
              <EmptyRow>Couldn’t load credentials: {error.message}</EmptyRow>
            ) : data.data.length === 0 ? (
              <EmptyRow>{query ? `Nothing matches “${query}”.` : 'No credentials yet. Create a group to get started.'}</EmptyRow>
            ) : (
              data.data.map((group) => (
                <TableRow key={group.id} className="cursor-pointer" onClick={() => navigate(`/credentials/${group.id}`)}>
                  <TableCell className="font-medium">
                    <Link to={`/credentials/${group.id}`} className="hover:underline" onClick={(e) => e.stopPropagation()}>
                      {group.name}
                    </Link>
                  </TableCell>
                  <TableCell className="max-w-sm">
                    <div className="flex items-center gap-2">
                      <span className="flex shrink-0 gap-0.5">
                        {group.kinds.map((kind) => (
                          <CredentialKindIcon key={kind} kind={kind} className="size-4 text-muted-foreground" />
                        ))}
                      </span>
                      <span className="truncate text-muted-foreground" title={group.credential_names.join(', ')}>
                        {group.credential_count === 0
                          ? 'Empty'
                          : `${group.credential_count} · ${group.credential_names.slice(0, 3).join(', ')}${group.credential_count > 3 ? '…' : ''}`}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">{formatDateTime(group.updated_at)}</TableCell>
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
      <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
        {children}
      </TableCell>
    </TableRow>
  )
}

function NewGroupDialog() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [error, setError] = useState<string>()
  const create = useCreateCredentialGroup()

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!name.trim()) return setError('Name can’t be blank')
    create.mutate(name.trim(), {
      onSuccess: (group) => {
        setOpen(false)
        setName('')
        navigate(`/credentials/${group.id}`)
      },
      onError: (err) => (err instanceof ApiError && err.fieldErrors.name ? setError(`Name ${err.fieldErrors.name[0]}`) : toast.error(err.message)),
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus data-icon="inline-start" /> New group
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New credential group</DialogTitle>
          <DialogDescription>Group related credentials, e.g. everything for one bank or service.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="group-name">Name</Label>
            <Input
              id="group-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setError(undefined)
              }}
              placeholder="HDFC Bank"
              aria-invalid={!!error}
              autoFocus
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={create.isPending}>
              Create group
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
