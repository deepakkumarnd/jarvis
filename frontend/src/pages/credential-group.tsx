import { useState, type FormEvent } from 'react'
import { ArrowLeft, Check, Lock, Pencil, Plus, Trash2, X } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { CredentialCard } from '@/components/credential-card'
import { CredentialFormDialog } from '@/components/credential-form-dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useCredentialGroup, useDeleteCredentialGroup, useRenameCredentialGroup } from '@/hooks/use-credentials'
import type { Credential, CredentialGroup } from '@/lib/api'
import { formatDateTime } from '@/lib/format'

export function CredentialGroupPage() {
  const id = Number(useParams().id)
  const { data: group, isPending, isError, error } = useCredentialGroup(id)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Credential>()

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/credentials">
          <ArrowLeft data-icon="inline-start" /> All credentials
        </Link>
      </Button>

      {isPending ? (
        <div className="space-y-4">
          <Skeleton className="h-9 w-1/2" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : isError ? (
        <p className="text-sm text-destructive">{error.message === 'Not found' ? 'This group doesn’t exist.' : error.message}</p>
      ) : (
        <>
          <GroupHeader group={group} />

          <div className="flex items-center justify-between gap-2">
            <h2 className="font-heading text-lg font-semibold">
              Credentials <span className="text-muted-foreground">({group.credentials.length})</span>
            </h2>
            <Button
              onClick={() => {
                setEditing(undefined)
                setFormOpen(true)
              }}
            >
              <Plus data-icon="inline-start" /> Add credential
            </Button>
          </div>

          {group.credentials.length === 0 ? (
            <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
              No credentials in this group yet.
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {group.credentials.map((credential) => (
                <CredentialCard
                  key={credential.id}
                  groupId={group.id}
                  credential={credential}
                  onEdit={() => {
                    setEditing(credential)
                    setFormOpen(true)
                  }}
                />
              ))}
            </div>
          )}

          <CredentialFormDialog groupId={group.id} open={formOpen} onOpenChange={setFormOpen} credential={editing} />
        </>
      )}
    </div>
  )
}

function GroupHeader({ group }: { group: CredentialGroup }) {
  const navigate = useNavigate()
  const [renaming, setRenaming] = useState(false)
  const [name, setName] = useState(group.name)
  const rename = useRenameCredentialGroup(group.id)
  const remove = useDeleteCredentialGroup()

  function handleRename(event: FormEvent) {
    event.preventDefault()
    if (!name.trim()) return toast.error('Name can’t be blank')
    rename.mutate(name.trim(), { onSuccess: () => setRenaming(false), onError: (error) => toast.error(error.message) })
  }

  function handleDelete(event: React.MouseEvent) {
    event.preventDefault()
    remove.mutate(group.id, {
      onSuccess: () => {
        toast.success(`Deleted “${group.name}”`)
        navigate('/credentials')
      },
      onError: (error) => toast.error(error.message),
    })
  }

  return (
    <header className="flex flex-wrap items-start justify-between gap-4 border-b pb-4">
      <div className="min-w-0 flex-1">
        {renaming ? (
          <form onSubmit={handleRename} className="flex max-w-xl items-center gap-2" onKeyDown={(e) => e.key === 'Escape' && setRenaming(false)}>
            <Input value={name} onChange={(e) => setName(e.target.value)} aria-label="Group name" className="h-9 text-lg" autoFocus />
            <Button type="submit" size="icon" aria-label="Save name" disabled={rename.isPending}>
              <Check />
            </Button>
            <Button type="button" variant="ghost" size="icon" aria-label="Cancel" onClick={() => setRenaming(false)}>
              <X />
            </Button>
          </form>
        ) : (
          <div className="flex items-center gap-2">
            <h1 className="font-heading text-3xl font-semibold tracking-tight break-words">{group.name}</h1>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Rename group"
              onClick={() => {
                setName(group.name)
                setRenaming(true)
              }}
            >
              <Pencil />
            </Button>
          </div>
        )}
        <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
          <Lock className="size-3.5 shrink-0" /> Encrypted · secrets load only when you view or copy them · updated {formatDateTime(group.updated_at)}
        </p>
      </div>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive">
            <Trash2 data-icon="inline-start" /> Delete group
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{group.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the group and its {group.credentials.length} {group.credentials.length === 1 ? 'credential' : 'credentials'}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={remove.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDelete} disabled={remove.isPending}>
              {remove.isPending ? 'Deleting…' : 'Delete group'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </header>
  )
}
