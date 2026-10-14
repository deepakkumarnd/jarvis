import { useState, type FormEvent } from 'react'
import { LogOut } from 'lucide-react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { useSession, useSignOut } from '@/hooks/use-session'
import { useSettings, useUpdateSettings } from '@/hooks/use-settings'
import { ApiError, type FieldErrors, type Settings } from '@/lib/api'
import { formatDateTime } from '@/lib/format'

export function SettingsPage() {
  const { data: settings, isPending, isError, error } = useSettings()

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Application-wide preferences.</p>
      </div>
      {isPending ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : isError ? (
        <p className="text-sm text-destructive">Couldn’t load settings: {error.message}</p>
      ) : (
        // Keyed by updated_at so the form resets to the saved values after each save
        <BrandingForm key={settings.updated_at} settings={settings} />
      )}
      <AccountCard />
    </div>
  )
}

function BrandingForm({ settings }: { settings: Settings }) {
  const [brandName, setBrandName] = useState(settings.brand_name)
  const [tagline, setTagline] = useState(settings.tagline)
  const [errors, setErrors] = useState<FieldErrors>({})
  const update = useUpdateSettings()
  const changed = brandName !== settings.brand_name || tagline !== settings.tagline

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    update.mutate(
      { brand_name: brandName.trim(), tagline: tagline.trim() },
      {
        onSuccess: () => toast.success('Settings saved'),
        onError: (error) => (error instanceof ApiError && error.status === 422 ? setErrors(error.fieldErrors) : toast.error(error.message)),
      },
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Branding</CardTitle>
        <CardDescription>Shown in the header and the browser tab. Last updated {formatDateTime(settings.updated_at)}.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div className="space-y-2">
            <Label htmlFor="brand-name">Brand name</Label>
            <Input
              id="brand-name"
              value={brandName}
              maxLength={50}
              onChange={(e) => {
                setBrandName(e.target.value)
                setErrors((prev) => ({ ...prev, brand_name: undefined }))
              }}
              aria-invalid={!!errors.brand_name}
            />
            {errors.brand_name?.map((m) => (
              <p key={m} className="text-sm text-destructive">
                Brand name {m}
              </p>
            ))}
          </div>
          <div className="space-y-2">
            <Label htmlFor="tagline">Tagline</Label>
            <Input
              id="tagline"
              value={tagline}
              maxLength={120}
              onChange={(e) => {
                setTagline(e.target.value)
                setErrors((prev) => ({ ...prev, tagline: undefined }))
              }}
              placeholder="Optional"
              aria-invalid={!!errors.tagline}
            />
            {errors.tagline?.map((m) => (
              <p key={m} className="text-sm text-destructive">
                Tagline {m}
              </p>
            ))}
          </div>

          <div className="rounded-lg border bg-muted/30 p-3">
            <p className="mb-1 text-xs text-muted-foreground">Preview</p>
            <p className="font-heading text-base leading-tight font-semibold">{brandName.trim() || '—'}</p>
            {tagline.trim() && <p className="text-[11px] leading-tight text-muted-foreground">{tagline.trim()}</p>}
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={!changed || update.isPending}>
              {update.isPending ? 'Saving…' : 'Save changes'}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!changed || update.isPending}
              onClick={() => {
                setBrandName(settings.brand_name)
                setTagline(settings.tagline)
                setErrors({})
              }}
            >
              Reset
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

function AccountCard() {
  const navigate = useNavigate()
  const { data } = useSession()
  const signOut = useSignOut()
  if (!data?.signedIn) return null
  const { session } = data

  return (
    <Card>
      <CardHeader>
        <CardTitle>Account</CardTitle>
        <CardDescription>
          Signed in as <span className="font-medium text-foreground">{session.username}</span> since {formatDateTime(session.signed_in_at)}. This
          session expires {formatDateTime(session.expires_at)}.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="outline" onClick={() => signOut.mutate(undefined, { onSettled: () => navigate('/login', { replace: true }) })} disabled={signOut.isPending}>
          <LogOut data-icon="inline-start" /> {signOut.isPending ? 'Logging out…' : 'Log out'}
        </Button>
      </CardContent>
    </Card>
  )
}
