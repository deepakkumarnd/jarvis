import { useState, type FormEvent } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { MarkdownEditor } from '@/components/markdown-editor'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { useNote, useSaveNote } from '@/hooks/use-notes'
import { ApiError, type FieldErrors, type Note } from '@/lib/api'

/** /notes/new and /notes/:id/edit */
export function NoteEditorPage() {
  const params = useParams()
  const id = params.id ? Number(params.id) : undefined

  if (!id) return <NoteForm />
  return <EditNote id={id} />
}

function EditNote({ id }: { id: number }) {
  const { data: note, isPending, isError, error } = useNote(id)

  if (isPending) return <Skeleton className="h-96 w-full" />
  if (isError) return <p className="text-sm text-destructive">{error.message}</p>
  return <NoteForm note={note} />
}

function NoteForm({ note }: { note?: Note }) {
  const navigate = useNavigate()
  const save = useSaveNote()
  const [title, setTitle] = useState(note?.title ?? '')
  const [body, setBody] = useState(note?.body ?? '')
  const [errors, setErrors] = useState<FieldErrors>({})
  const cancelTo = note ? `/notes/${note.id}` : '/notes'

  function submit() {
    setErrors({})
    save.mutate(
      { id: note?.id, input: { title: title.trim(), body } },
      {
        onSuccess: (saved) => {
          toast.success(note ? 'Note saved' : 'Note created')
          navigate(`/notes/${saved.id}`)
        },
        onError: (error) => {
          if (error instanceof ApiError && error.status === 422) setErrors(error.fieldErrors)
          else toast.error(error.message)
        },
      },
    )
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    submit()
  }

  // Ctrl/Cmd+S saves from anywhere in the form
  function handleKeyDown(event: React.KeyboardEvent) {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
      event.preventDefault()
      if (!save.isPending) submit()
    }
  }

  return (
    <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="space-y-6" noValidate>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to={cancelTo}>
            <ArrowLeft data-icon="inline-start" /> {note ? 'Back to note' : 'All notes'}
          </Link>
        </Button>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link to={cancelTo}>Cancel</Link>
          </Button>
          <Button type="submit" disabled={save.isPending}>
            {save.isPending ? 'Saving…' : note ? 'Save changes' : 'Create note'}
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="note-title">Title</Label>
        <Input
          id="note-title"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value)
            setErrors((prev) => ({ ...prev, title: undefined }))
          }}
          placeholder="Meeting notes"
          aria-invalid={!!errors.title}
          className="h-10 text-lg"
          autoFocus={!note}
        />
        {errors.title?.map((message) => (
          <p key={message} className="text-sm text-destructive">
            Title {message}
          </p>
        ))}
      </div>

      <div className="space-y-2">
        <Label htmlFor="note-body">Body</Label>
        <MarkdownEditor
          id="note-body"
          value={body}
          onChange={(value) => {
            setBody(value)
            setErrors((prev) => ({ ...prev, body: undefined }))
          }}
          placeholder={'# Heading\n\nWrite in **Markdown** — lists, links, tables, `code` and more.'}
          aria-invalid={!!errors.body}
        />
        {errors.body?.map((message) => (
          <p key={message} className="text-sm text-destructive">
            Body {message}
          </p>
        ))}
      </div>
    </form>
  )
}
