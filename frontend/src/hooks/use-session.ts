import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { sessionApi, type SessionState } from '@/lib/api'

export const sessionKey = ['session'] as const

export function useSession() {
  return useQuery({ queryKey: sessionKey, queryFn: sessionApi.get, staleTime: 5 * 60_000, retry: false })
}

/** Marks the session as signed out and drops every other cached response (private data). */
export function resetToSignedOut(queryClient: QueryClient) {
  // Update the session query in place (rather than clearing it) so the mounted route guard
  // sees the change and redirects to the login page.
  const signedOut: SessionState = { signedIn: false, setupRequired: false }
  queryClient.setQueryData(sessionKey, signedOut)
  const isOther = (query: { queryKey: readonly unknown[] }) => query.queryKey[0] !== sessionKey[0]
  void queryClient.cancelQueries({ predicate: isOther })
  queryClient.removeQueries({ predicate: isOther })
}

export function useSignIn() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ username, password }: { username: string; password: string }) => sessionApi.signIn(username, password),
    onSuccess: (session) => {
      const signedIn: SessionState = { signedIn: true, session }
      queryClient.setQueryData(sessionKey, signedIn)
    },
  })
}

export function useSignOut() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: sessionApi.signOut,
    // Even if the request fails, don't keep showing private data
    onSettled: () => resetToSignedOut(queryClient),
  })
}
