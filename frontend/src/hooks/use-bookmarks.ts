import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { bookmarksApi, type BookmarkInput } from '@/lib/api'

const bookmarksKey = ['bookmarks'] as const

export function useBookmarks({ query, page }: { query: string; page: number }) {
  return useQuery({
    queryKey: [...bookmarksKey, { query, page }],
    queryFn: () => (query ? bookmarksApi.search(query, page) : bookmarksApi.list(page)),
    placeholderData: keepPreviousData,
  })
}

export function useSaveBookmark() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id?: number; input: BookmarkInput }) =>
      id ? bookmarksApi.update(id, input) : bookmarksApi.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: bookmarksKey }),
  })
}

export function useDeleteBookmark() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => bookmarksApi.destroy(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: bookmarksKey }),
  })
}
