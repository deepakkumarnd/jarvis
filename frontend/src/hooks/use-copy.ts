import { toast } from 'sonner'

/** Copies text to the clipboard and confirms with a toast. */
export async function copyToClipboard(text: string, label: string) {
  try {
    await navigator.clipboard.writeText(text)
    toast.success(`${label} copied`)
  } catch {
    toast.error(`Couldn’t copy ${label.toLowerCase()} — your browser blocked clipboard access`)
  }
}
