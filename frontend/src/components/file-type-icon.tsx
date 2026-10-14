import { File, FileArchive, FileAudio, FileCode, FileImage, FileSpreadsheet, FileText, FileVideo } from 'lucide-react'
import { fileCategory } from '@/lib/file-types'

export function FileTypeIcon({ contentType, className }: { contentType: string; className?: string }) {
  switch (fileCategory(contentType)) {
    case 'image':
      return <FileImage className={className} aria-hidden />
    case 'video':
      return <FileVideo className={className} aria-hidden />
    case 'audio':
      return <FileAudio className={className} aria-hidden />
    case 'document':
      return <FileText className={className} aria-hidden />
    case 'archive':
      return <FileArchive className={className} aria-hidden />
    case 'spreadsheet':
      return <FileSpreadsheet className={className} aria-hidden />
    case 'code':
      return <FileCode className={className} aria-hidden />
    default:
      return <File className={className} aria-hidden />
  }
}
