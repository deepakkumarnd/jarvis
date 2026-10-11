import { ArrowLeft, Pencil, Trash2 } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { Markdown } from '@/components/markdown'
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
import { Skeleton } from '@/components/ui/skeleton'
import { useDeleteNote, useNote } from '@/hooks/use-notes'
import type { Note } from '@/lib/api'
import { formatDateTime } from '@/lib/format'

export function NoteViewPage() {
  const id = Number(useParams().id)
  const { data: note, isPending, isError, error } = useNote(id)

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/notes">
          <ArrowLeft data-icon="inline-start" /> All notes
        </Link>
      </Button>

      {isPending ? (
        <div className="space-y-4">
          <Skeleton className="h-9 w-2/3" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : isError ? (
        <p className="text-sm text-destructive">{error.message === 'Not found' ? 'This note doesn’t exist.' : error.message}</p>
      ) : (
        <article className="space-y-6">
          <header className="flex flex-wrap items-start justify-between gap-4 border-b pb-4">
            <div className="min-w-0">
              <h1 className="font-heading text-3xl font-semibold tracking-tight break-words">{note.title}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Updated {formatDateTime(note.updated_at)} · Created {formatDateTime(note.created_at)}
              </p>
            </div>
            <div className="flex gap-2">
              <Button asChild variant="outline">
                <Link to={`/notes/${note.id}/edit`}>
                  <Pencil data-icon="inline-start" /> Edit
                </Link>
              </Button>
              <DeleteNoteButton note={note} />
            </div>
          </header>
          {note.body.trim() ? <Markdown>{note.body}</Markdown> : <p className="text-muted-foreground italic">This note is empty.</p>}
        </article>
      )}
    </div>
  )
}

function DeleteNoteButton({ note }: { note: Note }) {
  const navigate = useNavigate()
  const remove = useDeleteNote()

  function handleDelete(event: React.MouseEvent) {
    // Keep the dialog open until the request finishes
    event.preventDefault()
    remove.mutate(note.id, {
      onSuccess: () => {
        toast.success(`Deleted “${note.title}”`)
        navigate('/notes')
      },
      onError: (error) => toast.error(error.message),
    })
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive">
          <Trash2 data-icon="inline-start" /> Delete
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this note?</AlertDialogTitle>
          <AlertDialogDescription>“{note.title}” will be permanently removed. This can’t be undone.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={remove.isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={handleDelete} disabled={remove.isPending}>
            {remove.isPending ? 'Deleting…' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
