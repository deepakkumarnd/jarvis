export type FileCategory = 'image' | 'video' | 'audio' | 'document' | 'archive' | 'spreadsheet' | 'code' | 'other'

export function fileCategory(contentType: string): FileCategory {
  if (contentType.startsWith('image/')) return 'image'
  if (contentType.startsWith('video/')) return 'video'
  if (contentType.startsWith('audio/')) return 'audio'
  if (contentType === 'application/pdf' || contentType.startsWith('text/')) return 'document'
  if (/zip|tar|gzip|compressed|7z|rar/.test(contentType)) return 'archive'
  if (/spreadsheet|excel|csv/.test(contentType)) return 'spreadsheet'
  if (/json|xml|javascript|yaml/.test(contentType)) return 'code'
  return 'other'
}

/** "application/pdf" -> "PDF", "image/png" -> "PNG" */
export function shortType(contentType: string) {
  const known: Record<string, string> = { 'text/plain': 'TXT', 'text/markdown': 'MD', 'image/svg+xml': 'SVG', 'image/jpeg': 'JPG' }
  if (known[contentType]) return known[contentType]
  const subtype = contentType.split('/')[1] ?? contentType
  return subtype.replace(/^(x-|vnd\.)/, '').split(/[.+;-]/)[0].toUpperCase().slice(0, 8)
}
