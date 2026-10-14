import { useQuery } from '@tanstack/react-query'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { documentsApi, type DocumentFileInfo } from '@/lib/api'
import { formatBytes } from '@/lib/format'

const MAX_TEXT_PREVIEW_BYTES = 200_000

/** Reads at most `limit` bytes of a response body, then cancels the rest of the download. */
async function readTextPrefix(response: Response, limit: number) {
  const reader = response.body!.getReader()
  const chunks: Uint8Array[] = []
  let received = 0
  while (received < limit) {
    const { done, value } = await reader.read()
    if (done) return { text: new TextDecoder().decode(concat(chunks, received)), truncated: false }
    chunks.push(value)
    received += value.byteLength
  }
  await reader.cancel()
  // Decode without a trailing partial character
  return { text: new TextDecoder().decode(concat(chunks, received).subarray(0, limit), { stream: true }), truncated: true }
}

function concat(chunks: Uint8Array[], length: number) {
  const out = new Uint8Array(length)
  let offset = 0
  for (const chunk of chunks) {
    out.set(chunk, offset)
    offset += chunk.byteLength
  }
  return out
}

type Props = {
  documentId: number
  file?: DocumentFileInfo
  onOpenChange: (open: boolean) => void
}

export function FilePreviewDialog({ documentId, file, onOpenChange }: Props) {
  return (
    <Dialog open={!!file} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90svh] flex-col sm:max-w-4xl">
        {file && (
          <>
            <DialogHeader>
              <DialogTitle className="truncate pr-8">{file.filename}</DialogTitle>
              <DialogDescription>
                {file.content_type} · {formatBytes(file.byte_size)}
              </DialogDescription>
            </DialogHeader>
            <div className="min-h-0 flex-1 overflow-auto rounded-lg border bg-muted/30">
              <PreviewBody documentId={documentId} file={file} />
            </div>
            <div className="flex justify-end">
              <Button asChild variant="outline">
                <a href={documentsApi.fileUrl(documentId, file.id)} download={file.filename}>
                  <Download data-icon="inline-start" /> Download
                </a>
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

function PreviewBody({ documentId, file }: { documentId: number; file: DocumentFileInfo }) {
  const url = documentsApi.fileUrl(documentId, file.id, { inline: true })

  switch (file.preview_kind) {
    case 'image':
      return <img src={url} alt={file.filename} className="mx-auto max-h-[70svh] object-contain" />
    case 'pdf':
      return <iframe src={url} title={file.filename} className="h-[70svh] w-full" />
    case 'text':
      return <TextPreview url={url} />
    default:
      return <p className="p-6 text-sm text-muted-foreground">This file type can’t be previewed.</p>
  }
}

function TextPreview({ url }: { url: string }) {
  const { data, isPending, isError } = useQuery({
    queryKey: ['file-preview', url],
    queryFn: async () => {
      const response = await fetch(url, { cache: 'no-store' })
      if (!response.ok) throw new Error(`Preview failed (${response.status})`)
      return readTextPrefix(response, MAX_TEXT_PREVIEW_BYTES)
    },
    staleTime: Infinity,
    gcTime: 0, // decrypted contents shouldn't linger in memory
  })

  if (isPending) return <Skeleton className="m-4 h-40" />
  if (isError) return <p className="p-6 text-sm text-destructive">Couldn’t load the preview.</p>

  return (
    <>
      <pre className="p-4 font-mono text-xs leading-relaxed break-words whitespace-pre-wrap">{data.text}</pre>
      {data.truncated && (
        <p className="px-4 pb-4 text-xs text-muted-foreground">Showing the first 200 KB — download the file to see all of it.</p>
      )}
    </>
  )
}
