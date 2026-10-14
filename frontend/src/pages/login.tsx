import { useState, type FormEvent } from 'react'
import { Lock, Terminal } from 'lucide-react'
import { Navigate, useNavigate, useSearchParams } from 'react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useSession, useSignIn } from '@/hooks/use-session'

/** Only allow redirects to paths within this app (no //evil.com or absolute URLs). */
function safeNext(next: string | null) {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/'
}

export function LoginPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const next = safeNext(searchParams.get('next'))
  const { data: session } = useSession()
  const signIn = useSignIn()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string>()

  if (session?.signedIn) return <Navigate to={next} replace />

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!username.trim() || !password) return setError('Enter your username and password')
    signIn.mutate(
      { username: username.trim(), password },
      {
        onSuccess: () => navigate(next, { replace: true }),
        onError: (err) => {
          setPassword('')
          setError(err.message)
        },
      },
    )
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Lock className="size-5" />
          </div>
          <CardTitle className="text-xl">Sign in</CardTitle>
          <CardDescription>This is a private system. Sign in to continue.</CardDescription>
        </CardHeader>
        <CardContent>
          {session && !session.signedIn && session.setupRequired ? (
            <div className="space-y-2 rounded-lg border bg-muted/40 p-3 text-sm">
              <p className="flex items-center gap-2 font-medium">
                <Terminal className="size-4" /> No account yet
              </p>
              <p className="text-muted-foreground">Create the user from the backend folder, then come back and sign in:</p>
              <code className="block rounded bg-background px-2 py-1.5 font-mono text-xs">bin/rails auth:create_user</code>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value)
                    setError(undefined)
                  }}
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    setError(undefined)
                  }}
                  autoComplete="current-password"
                />
              </div>
              {error && (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}
              <Button type="submit" className="w-full" disabled={signIn.isPending}>
                {signIn.isPending ? 'Signing in…' : 'Sign in'}
              </Button>
              <p className="text-center text-xs text-muted-foreground">You’ll stay signed in on this browser for a month.</p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
