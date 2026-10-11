import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { notesApi, type NoteInput } from '@/lib/api'

const notesKey = ['notes'] as const

export function useNotes(page: number) {
  return useQuery({
    queryKey: [...notesKey, 'list', { page }],
    queryFn: () => notesApi.list(page),
    placeholderData: keepPreviousData,
  })
}

export function useNote(id: number) {
  return useQuery({
    queryKey: [...notesKey, 'detail', id],
    queryFn: () => notesApi.get(id),
  })
}

export function useSaveNote() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id?: number; input: NoteInput }) =>
      id ? notesApi.update(id, input) : notesApi.create(input),
    onSuccess: (note) => {
      queryClient.setQueryData([...notesKey, 'detail', note.id], note)
      return queryClient.invalidateQueries({ queryKey: [...notesKey, 'list'] })
    },
  })
}

export function useDeleteNote() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => notesApi.destroy(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: [...notesKey, 'detail', id] })
      return queryClient.invalidateQueries({ queryKey: [...notesKey, 'list'] })
    },
  })
}
