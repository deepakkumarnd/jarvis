import { useState, type FormEvent } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import { CredentialKindIcon } from '@/components/credential-kind-icon'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { useSaveCredential } from '@/hooks/use-credentials'
import { ApiError, type Credential, type CredentialKind, type FieldErrors } from '@/lib/api'
import { credentialKinds, kindOrder } from '@/lib/credential-kinds'

type Props = {
  groupId: number
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The credential to edit; omit to add a new one. */
  credential?: Credential
}

export function CredentialFormDialog({ groupId, open, onOpenChange, credential }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{credential ? `Edit “${credential.name}”` : 'Add credential'}</DialogTitle>
          <DialogDescription>
            {credential ? 'Leave secret fields blank to keep their current values.' : 'Everything you enter is encrypted before it’s stored.'}
          </DialogDescription>
        </DialogHeader>
        {/* Rendered only while open, so the form resets each time */}
        <CredentialForm groupId={groupId} credential={credential} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}

function CredentialForm({ groupId, credential, onDone }: { groupId: number; credential?: Credential; onDone: () => void }) {
  const [kind, setKind] = useState<CredentialKind>(credential?.kind ?? 'username_password')
  const [name, setName] = useState(credential?.name ?? '')
  // Identifiers prefill when editing; secret fields always start blank
  const [fields, setFields] = useState<Record<string, string>>(credential?.fields ?? {})
  const [errors, setErrors] = useState<FieldErrors>({})
  const save = useSaveCredential(groupId)

  function setField(field: string, value: string) {
    setFields((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const specs = credentialKinds[kind].fields
    const input = { name: name.trim(), kind, fields: Object.fromEntries(specs.map((s) => [s.name, fields[s.name] ?? ''])) }
    save.mutate(
      { id: credential?.id, input },
      {
        onSuccess: (saved) => {
          toast.success(credential ? `Saved “${saved.name}”` : `Added “${saved.name}”`)
          onDone()
        },
        onError: (error) => {
          if (error instanceof ApiError && error.status === 422) setErrors(error.fieldErrors)
          else toast.error(error.message)
        },
      },
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate autoComplete="off">
      {!credential && (
        <div className="space-y-2">
          <Label>Type</Label>
          <Tabs value={kind} onValueChange={(value) => setKind(value as CredentialKind)}>
            <TabsList className="h-auto w-full flex-wrap">
              {kindOrder.map((k) => (
                <TabsTrigger key={k} value={k} className="gap-1.5">
                  <CredentialKindIcon kind={k} className="size-3.5" />
                  {credentialKinds[k].label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      )}

      <FormField id="credential-name" label="Name" errors={errors.name}>
        <Input
          id="credential-name"
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            setErrors((prev) => ({ ...prev, name: undefined }))
          }}
          placeholder="Online banking"
          aria-invalid={!!errors.name}
          autoFocus
        />
      </FormField>

      {credentialKinds[kind].fields.map((spec) => (
        <FormField key={spec.name} id={`credential-${spec.name}`} label={spec.label} errors={errors[spec.name]}>
          {spec.multiline ? (
            <Textarea
              id={`credential-${spec.name}`}
              value={fields[spec.name] ?? ''}
              onChange={(e) => setField(spec.name, e.target.value)}
              placeholder={credential ? 'Leave blank to keep the current secret' : spec.placeholder}
              aria-invalid={!!errors[spec.name]}
              className="min-h-32 font-mono text-sm"
              spellCheck={false}
            />
          ) : spec.secret ? (
            <SecretInput
              id={`credential-${spec.name}`}
              value={fields[spec.name] ?? ''}
              onChange={(value) => setField(spec.name, value)}
              placeholder={credential ? 'Leave blank to keep the current value' : spec.placeholder}
              invalid={!!errors[spec.name]}
            />
          ) : (
            <Input
              id={`credential-${spec.name}`}
              value={fields[spec.name] ?? ''}
              onChange={(e) => setField(spec.name, e.target.value)}
              placeholder={spec.placeholder}
              aria-invalid={!!errors[spec.name]}
              className="font-mono"
              spellCheck={false}
            />
          )}
        </FormField>
      ))}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? 'Saving…' : credential ? 'Save changes' : 'Add credential'}
        </Button>
      </DialogFooter>
    </form>
  )
}

function SecretInput({ id, value, onChange, placeholder, invalid }: { id: string; value: string; onChange: (v: string) => void; placeholder?: string; invalid: boolean }) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative">
      <Input
        id={id}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-invalid={invalid}
        autoComplete="new-password"
        className="pr-9 font-mono"
        spellCheck={false}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide what you typed' : 'Show what you typed'}
        className="absolute top-1/2 right-1.5 -translate-y-1/2"
      >
        {visible ? <EyeOff /> : <Eye />}
      </Button>
    </div>
  )
}

function FormField({ id, label, errors, children }: { id: string; label: string; errors?: string[]; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {errors?.map((message) => (
        <p key={message} className="text-sm text-destructive">
          {label} {message}
        </p>
      ))}
    </div>
  )
}
