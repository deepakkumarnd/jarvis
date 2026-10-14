import type { CredentialKind } from '@/lib/api'

type FieldSpec = { name: string; label: string; secret: boolean; multiline?: boolean; placeholder?: string }

export const credentialKinds: Record<CredentialKind, { label: string; fields: FieldSpec[] }> = {
  username_password: {
    label: 'Username & password',
    fields: [
      { name: 'username', label: 'Username', secret: false, placeholder: 'me@example.com' },
      { name: 'password', label: 'Password', secret: true },
    ],
  },
  api_key: {
    label: 'API key & secret',
    fields: [
      { name: 'api_key', label: 'API key', secret: false, placeholder: 'pk_live_…' },
      { name: 'secret_key', label: 'Secret key', secret: true, placeholder: 'sk_live_…' },
    ],
  },
  secret_text: {
    label: 'Secret text',
    fields: [{ name: 'secret', label: 'Secret', secret: true, multiline: true, placeholder: 'Recovery codes, PINs, notes…' }],
  },
}

export const kindOrder: CredentialKind[] = ['username_password', 'api_key', 'secret_text']

export function fieldLabel(kind: CredentialKind, field: string) {
  return credentialKinds[kind].fields.find((f) => f.name === field)?.label ?? field
}
