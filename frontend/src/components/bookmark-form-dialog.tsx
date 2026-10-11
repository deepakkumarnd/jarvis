import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useSaveBookmark } from '@/hooks/use-bookmarks'
import { ApiError, type Bookmark, type FieldErrors } from '@/lib/api'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The bookmark to edit; omit to create a new one. */
  bookmark?: Bookmark
}

export function BookmarkFormDialog({ open, onOpenChange, bookmark }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{bookmark ? 'Edit bookmark' : 'New bookmark'}</DialogTitle>
          <DialogDescription>Give the link a name you can search for later.</DialogDescription>
        </DialogHeader>
        {/* Rendered only while open, so the form state resets each time the dialog opens */}
        <BookmarkForm bookmark={bookmark} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}

function BookmarkForm({ bookmark, onDone }: { bookmark?: Bookmark; onDone: () => void }) {
  const [name, setName] = useState(bookmark?.name ?? '')
  const [link, setLink] = useState(bookmark?.link ?? '')
  const [errors, setErrors] = useState<FieldErrors>({})
  const save = useSaveBookmark()

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrors({})
    save.mutate(
      { id: bookmark?.id, input: { name: name.trim(), link: link.trim() } },
      {
        onSuccess: (saved) => {
          toast.success(bookmark ? `Updated “${saved.name}”` : `Added “${saved.name}”`)
          onDone()
        },
        onError: (error) => {
          if (error instanceof ApiError && error.status === 422) setErrors(error.fieldErrors)
          else toast.error(error.message)
        },
      },
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <Field id="bookmark-name" label="Name" errors={errors.name}>
        <Input
          id="bookmark-name"
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            setErrors((prev) => ({ ...prev, name: undefined }))
          }}
          placeholder="Rails Guides"
          aria-invalid={!!errors.name}
          autoFocus
        />
      </Field>
      <Field id="bookmark-link" label="Link" errors={errors.link}>
        <Input
          id="bookmark-link"
          type="url"
          value={link}
          onChange={(e) => {
            setLink(e.target.value)
            setErrors((prev) => ({ ...prev, link: undefined }))
          }}
          placeholder="https://guides.rubyonrails.org"
          aria-invalid={!!errors.link}
        />
      </Field>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? 'Saving…' : bookmark ? 'Save changes' : 'Add bookmark'}
        </Button>
      </DialogFooter>
    </form>
  )
}

function Field({ id, label, errors, children }: { id: string; label: string; errors?: string[]; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {errors?.map((message) => (
        <p key={message} className="text-sm text-destructive">
          {label} {message}
        </p>
      ))}
    </div>
  )
}
