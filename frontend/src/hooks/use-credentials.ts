import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { credentialsApi, type CredentialInput } from '@/lib/api'

const key = ['credentials'] as const
const groupKey = (id: number) => [...key, 'group', id] as const

export function useCredentialGroups({ query, page }: { query: string; page: number }) {
  return useQuery({
    queryKey: [...key, 'list', { query, page }],
    queryFn: () => credentialsApi.listGroups(query, page),
    placeholderData: keepPreviousData,
  })
}

export function useCredentialGroup(id: number) {
  return useQuery({ queryKey: groupKey(id), queryFn: () => credentialsApi.getGroup(id) })
}

function useInvalidate() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: key })
}

export function useCreateCredentialGroup() {
  const invalidate = useInvalidate()
  return useMutation({ mutationFn: (name: string) => credentialsApi.createGroup(name), onSuccess: invalidate })
}

export function useRenameCredentialGroup(id: number) {
  const invalidate = useInvalidate()
  return useMutation({ mutationFn: (name: string) => credentialsApi.renameGroup(id, name), onSuccess: invalidate })
}

export function useDeleteCredentialGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => credentialsApi.destroyGroup(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: groupKey(id) })
      return queryClient.invalidateQueries({ queryKey: [...key, 'list'] })
    },
  })
}

export function useSaveCredential(groupId: number) {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, input }: { id?: number; input: CredentialInput }) =>
      id ? credentialsApi.update(groupId, id, input) : credentialsApi.create(groupId, input),
    onSuccess: invalidate,
  })
}

export function useDeleteCredential(groupId: number) {
  const invalidate = useInvalidate()
  return useMutation({ mutationFn: (id: number) => credentialsApi.destroy(groupId, id), onSuccess: invalidate })
}
