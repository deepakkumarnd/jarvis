import { useState, type FormEvent } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { FileDropzone } from '@/components/file-dropzone'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { useCreateDocument } from '@/hooks/use-documents'
import { ApiError, type FieldErrors } from '@/lib/api'

export function NewDocumentPage() {
  const navigate = useNavigate()
  const create = useCreateDocument()
  const [name, setName] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [errors, setErrors] = useState<FieldErrors>({})
  const [progress, setProgress] = useState(0)

  function handleFilesChange(next: File[]) {
    setFiles(next)
    // Default the name to the first file's name (without extension)
    const defaultName = !name && next[0] ? next[0].name.replace(/\.[^.]+$/, '') : undefined
    if (defaultName) setName(defaultName)
    setErrors((prev) => ({ ...prev, files: undefined, ...(defaultName && { name: undefined }) }))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const clientErrors: FieldErrors = {}
    if (!name.trim()) clientErrors.name = ['can’t be blank']
    if (files.length === 0) clientErrors.files = ['Add at least one file']
    if (Object.keys(clientErrors).length) return setErrors(clientErrors)

    setProgress(0)
    create.mutate(
      { name: name.trim(), files, onProgress: setProgress },
      {
        onSuccess: (document) => {
          toast.success(`Uploaded “${document.name}” (${document.files.length} ${document.files.length === 1 ? 'file' : 'files'})`)
          navigate(`/documents/${document.id}`)
        },
        onError: (error) => {
          if (error instanceof ApiError && error.status === 422) setErrors(error.fieldErrors)
          else toast.error(error.message)
        },
      },
    )
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6" noValidate>
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/documents">
          <ArrowLeft data-icon="inline-start" /> All documents
        </Link>
      </Button>

      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Upload documents</h1>
        <p className="text-sm text-muted-foreground">Group related files under one name. Files are encrypted before they’re stored.</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="document-name">Name</Label>
        <Input
          id="document-name"
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            setErrors((prev) => ({ ...prev, name: undefined }))
          }}
          placeholder="Tax return 2025"
          aria-invalid={!!errors.name}
          disabled={create.isPending}
        />
        {errors.name?.map((m) => (
          <p key={m} className="text-sm text-destructive">
            Name {m}
          </p>
        ))}
      </div>

      <div className="space-y-2">
        <Label>Files</Label>
        <FileDropzone files={files} onChange={handleFilesChange} disabled={create.isPending} aria-invalid={!!errors.files} />
        {errors.files?.map((m) => (
          <p key={m} className="text-sm text-destructive">
            {m}
          </p>
        ))}
      </div>

      {create.isPending && (
        <div className="space-y-1.5">
          <Progress value={progress * 100} aria-label="Upload progress" />
          <p className="text-xs text-muted-foreground">{progress < 1 ? `Uploading… ${Math.round(progress * 100)}%` : 'Encrypting…'}</p>
        </div>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={create.isPending}>
          {create.isPending ? 'Uploading…' : `Upload${files.length ? ` ${files.length} ${files.length === 1 ? 'file' : 'files'}` : ''}`}
        </Button>
        <Button asChild variant="outline">
          <Link to="/documents">Cancel</Link>
        </Button>
      </div>
    </form>
  )
}
