import { KeyRound, ScrollText, UserRound } from 'lucide-react'
import type { CredentialKind } from '@/lib/api'

export function CredentialKindIcon({ kind, className }: { kind: CredentialKind; className?: string }) {
  switch (kind) {
    case 'username_password':
      return <UserRound className={className} aria-hidden />
    case 'api_key':
      return <KeyRound className={className} aria-hidden />
    case 'secret_text':
      return <ScrollText className={className} aria-hidden />
  }
}
