import { useEffect, useState } from 'react'
import { Copy, Eye, EyeOff, Loader2, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { CredentialKindIcon } from '@/components/credential-kind-icon'
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
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { copyToClipboard } from '@/hooks/use-copy'
import { useDeleteCredential } from '@/hooks/use-credentials'
import { credentialsApi, type Credential } from '@/lib/api'
import { credentialKinds, fieldLabel } from '@/lib/credential-kinds'
import { formatDateTime } from '@/lib/format'

/** Revealed secrets are hidden again after this long, or as soon as the tab is hidden. */
const REVEAL_SECONDS = 30
const MASK = '••••••••••••'

type Props = { groupId: number; credential: Credential; onEdit: () => void }

export function CredentialCard({ groupId, credential, onEdit }: Props) {
  // Secrets live only in this component's state: fetched on demand, never cached, cleared on hide
  const [secrets, setSecrets] = useState<Record<string, string> | null>(null)
  const [hideAt, setHideAt] = useState(0)
  const [secondsLeft, setSecondsLeft] = useState(REVEAL_SECONDS)
  const [loading, setLoading] = useState<string | null>(null)
  const remove = useDeleteCredential(groupId)

  // Count down while revealed; hide at the deadline or as soon as the tab is hidden
  useEffect(() => {
    if (!secrets) return
    const timer = setInterval(() => {
      const left = Math.ceil((hideAt - Date.now()) / 1000)
      if (left <= 0) setSecrets(null)
      else setSecondsLeft(left)
    }, 250)
    const hideOnLeave = () => document.visibilityState === 'hidden' && setSecrets(null)
    document.addEventListener('visibilitychange', hideOnLeave)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', hideOnLeave)
    }
  }, [secrets, hideAt])

  async function fetchSecrets(action: string) {
    setLoading(action)
    try {
      return await credentialsApi.fetchSecrets(groupId, credential.id)
    } catch (error) {
      toast.error(`Couldn’t load the secret: ${(error as Error).message}`)
      return null
    } finally {
      setLoading(null)
    }
  }

  async function toggleReveal() {
    if (secrets) return setSecrets(null)
    const fetched = await fetchSecrets('view')
    if (fetched) {
      setSecrets(fetched)
      setHideAt(Date.now() + REVEAL_SECONDS * 1000)
      setSecondsLeft(REVEAL_SECONDS)
    }
  }

  async function copySecret(field: string) {
    // Copy without revealing: fetch, copy, and discard unless already shown
    const value = secrets?.[field] ?? (await fetchSecrets(`copy-${field}`))?.[field]
    if (value !== undefined) await copyToClipboard(value, fieldLabel(credential.kind, field))
  }

  const fieldSpecs = credentialKinds[credential.kind].fields

  return (
    // min-w-0 lets the card shrink inside the grid so long names truncate instead of pushing actions off-screen
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle className="flex min-w-0 items-center gap-2">
          <CredentialKindIcon kind={credential.kind} className="size-4 shrink-0 text-muted-foreground" />
          <span className="truncate">{credential.name}</span>
        </CardTitle>
        <CardDescription className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{credentialKinds[credential.kind].label}</Badge>
          <span>Updated {formatDateTime(credential.updated_at)}</span>
        </CardDescription>
        <CardAction className="flex gap-1">
          <Button variant="ghost" size="icon-sm" onClick={onEdit} aria-label={`Edit ${credential.name}`}>
            <Pencil />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label={`Delete ${credential.name}`} className="text-destructive hover:text-destructive">
                <Trash2 />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete “{credential.name}”?</AlertDialogTitle>
                <AlertDialogDescription>The stored {credentialKinds[credential.kind].label.toLowerCase()} will be permanently deleted.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  onClick={() =>
                    remove.mutate(credential.id, {
                      onSuccess: () => toast.success(`Deleted “${credential.name}”`),
                      onError: (error) => toast.error(error.message),
                    })
                  }
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardAction>
      </CardHeader>
      <CardContent>
        <dl className="space-y-3">
          {fieldSpecs.map((spec) => {
            const value = spec.secret ? secrets?.[spec.name] : credential.fields[spec.name]
            const shown = value !== undefined
            return (
              <div key={spec.name} className="space-y-1">
                <dt className="text-xs text-muted-foreground">{spec.label}</dt>
                <dd className="flex items-start gap-2">
                  <div
                    className={
                      'min-w-0 flex-1 rounded-md border bg-muted/40 px-2.5 py-1.5 font-mono text-sm ' +
                      (spec.multiline && shown ? 'max-h-60 overflow-auto break-words whitespace-pre-wrap' : 'truncate')
                    }
                    aria-label={shown ? undefined : `${spec.label} hidden`}
                  >
                    {shown ? value : <span className="tracking-widest text-muted-foreground select-none">{MASK}</span>}
                  </div>
                  {spec.secret && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={toggleReveal}
                      disabled={loading === 'view'}
                      aria-label={`${secrets ? 'Hide' : 'View'} ${spec.label.toLowerCase()}`}
                    >
                      {loading === 'view' ? <Loader2 className="animate-spin" /> : secrets ? <EyeOff /> : <Eye />}
                      <span className="hidden sm:inline">{secrets ? 'Hide' : 'View'}</span>
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => (spec.secret ? copySecret(spec.name) : copyToClipboard(credential.fields[spec.name], spec.label))}
                    disabled={loading === `copy-${spec.name}`}
                    aria-label={`Copy ${spec.label.toLowerCase()}`}
                  >
                    {loading === `copy-${spec.name}` ? <Loader2 className="animate-spin" /> : <Copy />}
                    <span className="hidden sm:inline">Copy</span>
                  </Button>
                </dd>
              </div>
            )
          })}
        </dl>
        {secrets && (
          <p className="mt-3 text-xs text-muted-foreground" aria-live="polite">
            Hiding in {secondsLeft}s
          </p>
        )}
      </CardContent>
    </Card>
  )
}
