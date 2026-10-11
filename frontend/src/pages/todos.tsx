import { useState, type FormEvent, type KeyboardEvent } from 'react'
import { CalendarDays, Check, Pencil, Plus, Trash2, X } from 'lucide-react'
import { useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { PaginationBar } from '@/components/pagination-bar'
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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useClearCompletedTodos, useCreateTodo, useDeleteTodo, useTodos, useUpdateTodo } from '@/hooks/use-todos'
import { ApiError, type Todo, type TodoStatus } from '@/lib/api'
import { daysFromToday, formatDueDate } from '@/lib/format'
import { cn } from '@/lib/utils'

const statuses: { value: TodoStatus; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
]

export function TodosPage() {
  // Filter and page live in the URL (?status=&page=)
  const [searchParams, setSearchParams] = useSearchParams()
  const status = (statuses.find((s) => s.value === searchParams.get('status'))?.value ?? 'all') as TodoStatus
  const page = Math.max(1, Number(searchParams.get('page')) || 1)
  const { data, isPending, isError, error, isPlaceholderData } = useTodos(status, page)
  const counts = data?.meta.counts

  function goTo(next: { status?: TodoStatus; page?: number }) {
    const params = new URLSearchParams()
    const s = next.status ?? status
    const p = next.page ?? page
    if (s !== 'all') params.set('status', s)
    if (p > 1) params.set('page', String(p))
    setSearchParams(params)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Todos</h1>
        <p className="text-sm text-muted-foreground">{counts ? `${counts.active} open · ${counts.completed} done` : 'Things to get done'}</p>
      </div>

      <NewTodoForm />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Tabs value={status} onValueChange={(value) => goTo({ status: value as TodoStatus, page: 1 })}>
          <TabsList>
            {statuses.map((s) => (
              <TabsTrigger key={s.value} value={s.value}>
                {s.label}
                {counts && <span className="ml-1 text-muted-foreground tabular-nums">{counts[s.value]}</span>}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        {!!counts?.completed && <ClearCompletedButton count={counts.completed} />}
      </div>

      <div className={cn('divide-y rounded-lg border', isPlaceholderData && 'opacity-60')}>
        {isPending ? (
          Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="p-3">
              <Skeleton className="h-6 w-full" />
            </div>
          ))
        ) : isError ? (
          <p className="p-6 text-center text-sm text-destructive">Couldn’t load todos: {error.message}</p>
        ) : data.data.length === 0 ? (
          <p className="p-10 text-center text-sm text-muted-foreground">
            {status === 'completed' ? 'Nothing completed yet.' : status === 'active' ? 'All done! 🎉' : 'No todos yet. Add one above.'}
          </p>
        ) : (
          data.data.map((todo) => <TodoRow key={todo.id} todo={todo} />)
        )}
      </div>

      {data && <PaginationBar meta={data.meta} onPageChange={(p) => goTo({ page: p })} />}
    </div>
  )
}

function NewTodoForm() {
  const [title, setTitle] = useState('')
  const [dueOn, setDueOn] = useState('')
  const [error, setError] = useState<string>()
  const create = useCreateTodo()

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!title.trim()) return setError('Title can’t be blank')
    create.mutate(
      { title: title.trim(), due_on: dueOn || null },
      {
        onSuccess: () => {
          setTitle('')
          setDueOn('')
        },
        onError: (err) => setError(err instanceof ApiError && err.fieldErrors.title ? `Title ${err.fieldErrors.title[0]}` : err.message),
      },
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-1.5">
      <div className="flex flex-wrap gap-2">
        <Input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value)
            setError(undefined)
          }}
          placeholder="What needs doing?"
          aria-label="New todo"
          aria-invalid={!!error}
          className="h-9 min-w-48 flex-1"
          autoFocus
        />
        <Input type="date" value={dueOn} onChange={(e) => setDueOn(e.target.value)} aria-label="Due date" className="h-9 w-auto" />
        <Button type="submit" size="lg" disabled={create.isPending}>
          <Plus data-icon="inline-start" /> Add
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </form>
  )
}

function TodoRow({ todo }: { todo: Todo }) {
  const [editing, setEditing] = useState(false)
  const update = useUpdateTodo()
  const remove = useDeleteTodo()
  const create = useCreateTodo()

  function toggle(checked: boolean) {
    update.mutate({ id: todo.id, input: { completed: checked } }, { onError: (error) => toast.error(error.message) })
  }

  function handleDelete() {
    remove.mutate(todo.id, {
      onSuccess: () =>
        toast.success(`Deleted “${todo.title}”`, {
          duration: 6000,
          action: {
            label: 'Undo',
            onClick: () => create.mutate({ title: todo.title, completed: todo.completed, due_on: todo.due_on }),
          },
        }),
      onError: (error) => toast.error(error.message),
    })
  }

  if (editing) return <EditTodoRow todo={todo} onDone={() => setEditing(false)} />

  const checkboxId = `todo-${todo.id}`

  return (
    <div className="group flex items-center gap-3 px-3 py-2.5">
      <Checkbox id={checkboxId} checked={todo.completed} onCheckedChange={(checked) => toggle(checked === true)} />
      <label
        htmlFor={checkboxId}
        className={cn('min-w-0 flex-1 cursor-pointer text-sm break-words', todo.completed && 'text-muted-foreground line-through')}
      >
        {todo.title}
      </label>
      {todo.due_on && <DueBadge dueOn={todo.due_on} completed={todo.completed} />}
      <div className="flex shrink-0 opacity-100 transition-opacity sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
        <Button variant="ghost" size="icon-sm" onClick={() => setEditing(true)} aria-label={`Edit ${todo.title}`}>
          <Pencil />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleDelete}
          disabled={remove.isPending}
          aria-label={`Delete ${todo.title}`}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 />
        </Button>
      </div>
    </div>
  )
}

function DueBadge({ dueOn, completed }: { dueOn: string; completed: boolean }) {
  const days = daysFromToday(dueOn)
  const tone = completed ? 'outline' : days < 0 ? 'destructive' : 'outline'

  return (
    <Badge
      variant={tone}
      className={cn('shrink-0 gap-1', !completed && days === 0 && 'border-amber-500/50 text-amber-700 dark:text-amber-400')}
      title={dueOn}
    >
      <CalendarDays />
      {!completed && days < 0 ? `Overdue · ${formatDueDate(dueOn)}` : formatDueDate(dueOn)}
    </Badge>
  )
}

function EditTodoRow({ todo, onDone }: { todo: Todo; onDone: () => void }) {
  const [title, setTitle] = useState(todo.title)
  const [dueOn, setDueOn] = useState(todo.due_on ?? '')
  const update = useUpdateTodo()

  function save() {
    if (!title.trim()) return toast.error('Title can’t be blank')
    update.mutate({ id: todo.id, input: { title: title.trim(), due_on: dueOn || null } }, { onError: (error) => toast.error(error.message) })
    onDone()
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault()
      save()
    } else if (event.key === 'Escape') {
      onDone()
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 bg-muted/40 px-3 py-2" onKeyDown={handleKeyDown}>
      <Input value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Todo title" className="min-w-48 flex-1" autoFocus />
      <Input type="date" value={dueOn} onChange={(e) => setDueOn(e.target.value)} aria-label="Due date" className="w-auto" />
      <Button size="icon-sm" onClick={save} aria-label="Save">
        <Check />
      </Button>
      <Button size="icon-sm" variant="ghost" onClick={onDone} aria-label="Cancel">
        <X />
      </Button>
    </div>
  )
}

function ClearCompletedButton({ count }: { count: number }) {
  const clear = useClearCompletedTodos()

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-muted-foreground">
          Clear completed ({count})
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {count} completed {count === 1 ? 'todo' : 'todos'}?</AlertDialogTitle>
          <AlertDialogDescription>This permanently removes every completed todo. It can’t be undone.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() =>
              clear.mutate(undefined, {
                onSuccess: ({ deleted }) => toast.success(`Cleared ${deleted} completed ${deleted === 1 ? 'todo' : 'todos'}`),
                onError: (error) => toast.error(error.message),
              })
            }
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
