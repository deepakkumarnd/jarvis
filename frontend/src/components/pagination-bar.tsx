import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { PaginationMeta } from '@/lib/api'

export function PaginationBar({ meta, onPageChange }: { meta: PaginationMeta; onPageChange: (page: number) => void }) {
  if (meta.total_pages <= 1) return null

  const first = (meta.page - 1) * meta.per_page + 1
  const last = Math.min(meta.page * meta.per_page, meta.total_count)

  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <p className="text-muted-foreground">
        Showing {first}–{last} of {meta.total_count}
      </p>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={meta.page <= 1} onClick={() => onPageChange(meta.page - 1)}>
          <ChevronLeft data-icon="inline-start" /> Previous
        </Button>
        <span className="tabular-nums">
          Page {meta.page} of {meta.total_pages}
        </span>
        <Button variant="outline" size="sm" disabled={meta.page >= meta.total_pages} onClick={() => onPageChange(meta.page + 1)}>
          Next <ChevronRight data-icon="inline-end" />
        </Button>
      </div>
    </div>
  )
}
