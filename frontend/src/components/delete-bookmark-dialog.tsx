import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useDeleteBookmark } from '@/hooks/use-bookmarks'
import type { Bookmark } from '@/lib/api'

type Props = {
  bookmark?: Bookmark
  onOpenChange: (open: boolean) => void
}

export function DeleteBookmarkDialog({ bookmark, onOpenChange }: Props) {
  const remove = useDeleteBookmark()

  function handleDelete(event: React.MouseEvent) {
    if (!bookmark) return
    // Keep the dialog open until the request finishes
    event.preventDefault()
    remove.mutate(bookmark.id, {
      onSuccess: () => {
        toast.success(`Deleted “${bookmark.name}”`)
        onOpenChange(false)
      },
      onError: (error) => toast.error(error.message),
    })
  }

  return (
    <AlertDialog open={!!bookmark} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this bookmark?</AlertDialogTitle>
          <AlertDialogDescription>
            “{bookmark?.name}” will be permanently removed. This can’t be undone.
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
