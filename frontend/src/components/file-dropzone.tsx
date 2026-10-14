import { useRef, useState, type DragEvent } from 'react'
import { Upload, X } from 'lucide-react'
import { FileTypeIcon } from '@/components/file-type-icon'
import { Button } from '@/components/ui/button'
import { MAX_FILE_BYTES, MAX_FILE_LABEL, MAX_FILES_PER_UPLOAD } from '@/lib/api'
import { formatBytes } from '@/lib/format'
import { cn } from '@/lib/utils'

type Props = {
  files: File[]
  onChange: (files: File[]) => void
  disabled?: boolean
  'aria-invalid'?: boolean
}

/** Drag-and-drop or click-to-browse file picker. Rejects files over the size limit and duplicates. */
export function FileDropzone({ files, onChange, disabled, 'aria-invalid': ariaInvalid }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [rejected, setRejected] = useState<string[]>([])

  function addFiles(incoming: FileList | null) {
    if (!incoming) return
    const tooLarge: string[] = []
    const next = [...files]
    for (const file of Array.from(incoming)) {
      if (file.size > MAX_FILE_BYTES) tooLarge.push(`${file.name} is larger than ${MAX_FILE_LABEL}`)
      else if (!next.some((f) => f.name === file.name && f.size === file.size && f.lastModified === file.lastModified)) next.push(file)
    }
    if (next.length > MAX_FILES_PER_UPLOAD) tooLarge.push(`You can upload at most ${MAX_FILES_PER_UPLOAD} files at once`)
    setRejected(tooLarge)
    onChange(next.slice(0, MAX_FILES_PER_UPLOAD))
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault()
    setDragging(false)
    if (!disabled) addFiles(event.dataTransfer.files)
  }

  return (
    <div className="space-y-3">
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        aria-invalid={ariaInvalid}
        aria-label="Add files: drop them here or press Enter to browse"
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && !disabled && (e.preventDefault(), inputRef.current?.click())}
        onDragOver={(e) => {
          e.preventDefault()
          if (!disabled) setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition-colors outline-none',
          'hover:border-foreground/30 hover:bg-muted/40 focus-visible:ring-3 focus-visible:ring-ring/50',
          dragging && 'border-foreground/50 bg-muted/60',
          ariaInvalid && 'border-destructive/60',
          disabled && 'pointer-events-none opacity-60',
        )}
      >
        <Upload className="size-6 text-muted-foreground" />
        <p className="text-sm font-medium">{dragging ? 'Drop to add' : 'Drag & drop files here, or click to browse'}</p>
        <p className="text-xs text-muted-foreground">
          Up to {MAX_FILES_PER_UPLOAD} files at once · max {MAX_FILE_LABEL} each · encrypted on upload
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          hidden
          onChange={(e) => {
            addFiles(e.target.files)
            e.target.value = '' // allow picking the same file again after removing it
          }}
        />
      </div>

      {rejected.map((message) => (
        <p key={message} className="text-sm text-destructive">
          {message}
        </p>
      ))}

      {files.length > 0 && (
        <ul className="divide-y rounded-lg border">
          {files.map((file, i) => (
              <li key={`${file.name}-${file.size}-${file.lastModified}`} className="flex items-center gap-3 px-3 py-2 text-sm">
                <FileTypeIcon contentType={file.type} className="size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate">{file.name}</span>
                <span className="shrink-0 text-muted-foreground tabular-nums">{formatBytes(file.size)}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  disabled={disabled}
                  onClick={() => onChange(files.filter((_, j) => j !== i))}
                  aria-label={`Remove ${file.name}`}
                >
                  <X />
                </Button>
              </li>
          ))}
        </ul>
      )}
    </div>
  )
}
