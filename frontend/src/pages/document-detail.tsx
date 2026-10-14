import { useState, type FormEvent } from 'react'
import { ArrowLeft, Check, Download, Eye, Lock, Pencil, Plus, Trash2, X } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { FileDropzone } from '@/components/file-dropzone'
import { FilePreviewDialog } from '@/components/file-preview-dialog'
import { FileTypeIcon } from '@/components/file-type-icon'
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
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { useAddDocumentFiles, useDeleteDocument, useDeleteDocumentFile, useDocument, useRenameDocument } from '@/hooks/use-documents'
import { documentsApi, type DocumentDetail, type DocumentFileInfo } from '@/lib/api'
import { shortType } from '@/lib/file-types'
import { formatBytes, formatDateTime } from '@/lib/format'

export function DocumentDetailPage() {
  const id = Number(useParams().id)
  const { data: document, isPending, isError, error } = useDocument(id)
  const [previewing, setPreviewing] = useState<DocumentFileInfo>()

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/documents">
          <ArrowLeft data-icon="inline-start" /> All documents
        </Link>
      </Button>

      {isPending ? (
        <div className="space-y-4">
          <Skeleton className="h-9 w-1/2" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : isError ? (
        <p className="text-sm text-destructive">{error.message === 'Not found' ? 'This document doesn’t exist.' : error.message}</p>
      ) : (
        <>
          <DocumentHeader document={document} />

          <section className="space-y-3" aria-labelledby="files-heading">
            <h2 id="files-heading" className="font-heading text-lg font-semibold">
              Files <span className="text-muted-foreground">({document.files.length})</span>
            </h2>
            <ul className="divide-y rounded-lg border">
              {document.files.map((file) => (
                <FileRow key={file.id} document={document} file={file} onPreview={() => setPreviewing(file)} />
              ))}
            </ul>
          </section>

          <AddFiles documentId={document.id} />
          <FilePreviewDialog documentId={document.id} file={previewing} onOpenChange={(open) => !open && setPreviewing(undefined)} />
        </>
      )}
    </div>
  )
}

function DocumentHeader({ document }: { document: DocumentDetail }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(document.name)
  const rename = useRenameDocument(document.id)

  function handleRename(event: FormEvent) {
    event.preventDefault()
    if (!name.trim()) return toast.error('Name can’t be blank')
    rename.mutate(name.trim(), {
      onSuccess: () => setEditing(false),
      onError: (error) => toast.error(error.message),
    })
  }

  return (
    <header className="flex flex-wrap items-start justify-between gap-4 border-b pb-4">
      <div className="min-w-0 flex-1">
        {editing ? (
          <form onSubmit={handleRename} className="flex max-w-xl items-center gap-2" onKeyDown={(e) => e.key === 'Escape' && setEditing(false)}>
            <Input value={name} onChange={(e) => setName(e.target.value)} aria-label="Document name" className="h-9 text-lg" autoFocus />
            <Button type="submit" size="icon" aria-label="Save name" disabled={rename.isPending}>
              <Check />
            </Button>
            <Button type="button" variant="ghost" size="icon" aria-label="Cancel" onClick={() => setEditing(false)}>
              <X />
            </Button>
          </form>
        ) : (
          <div className="flex items-center gap-2">
            <h1 className="font-heading text-3xl font-semibold tracking-tight break-words">{document.name}</h1>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Rename document"
              onClick={() => {
                setName(document.name)
                setEditing(true)
              }}
            >
              <Pencil />
            </Button>
          </div>
        )}
        <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-sm text-muted-foreground">
          <Lock className="size-3.5" /> Encrypted · {document.files.length} {document.files.length === 1 ? 'file' : 'files'} · {formatBytes(document.total_bytes)} ·
          Updated {formatDateTime(document.updated_at)}
        </p>
      </div>
      <DeleteDocumentButton document={document} />
    </header>
  )
}

function FileRow({ document, file, onPreview }: { document: DocumentDetail; file: DocumentFileInfo; onPreview: () => void }) {
  const remove = useDeleteDocumentFile(document.id)
  const isOnlyFile = document.files.length === 1

  return (
    <li className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:gap-3">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <FileTypeIcon contentType={file.content_type} className="size-5 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium" title={file.filename}>
            {file.filename}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatBytes(file.byte_size)} · added {formatDateTime(file.created_at)}
          </p>
        </div>
        <Badge variant="outline" className="shrink-0" title={file.content_type}>
          {shortType(file.content_type)}
        </Badge>
      </div>
      <div className="flex shrink-0 items-center gap-1 pl-8 sm:pl-0">
        {file.preview_kind && (
          <Button variant="outline" size="sm" onClick={onPreview} aria-label={`Preview ${file.filename}`}>
            <Eye data-icon="inline-start" /> Preview
          </Button>
        )}
        <Button asChild variant="outline" size="sm">
          <a href={documentsApi.fileUrl(document.id, file.id)} download={file.filename} aria-label={`Download ${file.filename}`}>
            <Download data-icon="inline-start" /> Download
          </a>
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={isOnlyFile || remove.isPending}
              aria-label={`Delete ${file.filename}`}
              title={isOnlyFile ? 'A document needs at least one file — delete the document instead' : undefined}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this file?</AlertDialogTitle>
              <AlertDialogDescription>“{file.filename}” will be permanently removed from “{document.name}”.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={() =>
                  remove.mutate(file.id, {
                    onSuccess: () => toast.success(`Deleted “${file.filename}”`),
                    onError: (error) => toast.error(error.message),
                  })
                }
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </li>
  )
}

function AddFiles({ documentId }: { documentId: number }) {
  const [files, setFiles] = useState<File[]>([])
  const [progress, setProgress] = useState(0)
  const add = useAddDocumentFiles(documentId)

  function upload() {
    setProgress(0)
    add.mutate(
      { files, onProgress: setProgress },
      {
        onSuccess: () => {
          toast.success(`Added ${files.length} ${files.length === 1 ? 'file' : 'files'}`)
          setFiles([])
        },
        onError: (error) => toast.error(error.message),
      },
    )
  }

  return (
    <section className="space-y-3" aria-labelledby="add-files-heading">
      <h2 id="add-files-heading" className="font-heading text-lg font-semibold">
        Add files
      </h2>
      <FileDropzone files={files} onChange={setFiles} disabled={add.isPending} />
      {add.isPending && <Progress value={progress * 100} aria-label="Upload progress" />}
      {files.length > 0 && (
        <Button onClick={upload} disabled={add.isPending}>
          <Plus data-icon="inline-start" />
          {add.isPending ? 'Uploading…' : `Add ${files.length} ${files.length === 1 ? 'file' : 'files'}`}
        </Button>
      )}
    </section>
  )
}

function DeleteDocumentButton({ document }: { document: DocumentDetail }) {
  const navigate = useNavigate()
  const remove = useDeleteDocument()

  function handleDelete(event: React.MouseEvent) {
    event.preventDefault()
    remove.mutate(document.id, {
      onSuccess: () => {
        toast.success(`Deleted “${document.name}”`)
        navigate('/documents')
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
          <AlertDialogTitle>Delete this document?</AlertDialogTitle>
          <AlertDialogDescription>
            “{document.name}” and its {document.files.length} {document.files.length === 1 ? 'file' : 'files'} will be permanently deleted. This
            can’t be undone.
          </AlertDialogDescription>
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
