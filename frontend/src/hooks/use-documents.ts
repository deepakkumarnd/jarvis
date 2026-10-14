import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { documentsApi, type DocumentDetail } from '@/lib/api'

const documentsKey = ['documents'] as const
const detailKey = (id: number) => [...documentsKey, 'detail', id] as const

export function useDocuments({ query, page }: { query: string; page: number }) {
  return useQuery({
    queryKey: [...documentsKey, 'list', { query, page }],
    queryFn: () => documentsApi.list(query, page),
    placeholderData: keepPreviousData,
  })
}

export function useDocument(id: number) {
  return useQuery({ queryKey: detailKey(id), queryFn: () => documentsApi.get(id) })
}

/** Any mutation that returns the updated document refreshes its detail and the lists. */
function useDocumentMutation<TVariables>(mutationFn: (variables: TVariables) => Promise<DocumentDetail>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: (document) => {
      queryClient.setQueryData(detailKey(document.id), document)
      return queryClient.invalidateQueries({ queryKey: [...documentsKey, 'list'] })
    },
  })
}

export function useCreateDocument() {
  return useDocumentMutation(({ name, files, onProgress }: { name: string; files: File[]; onProgress?: (f: number) => void }) =>
    documentsApi.create(name, files, onProgress),
  )
}

export function useAddDocumentFiles(id: number) {
  return useDocumentMutation(({ files, onProgress }: { files: File[]; onProgress?: (f: number) => void }) =>
    documentsApi.addFiles(id, files, onProgress),
  )
}

export function useRenameDocument(id: number) {
  return useDocumentMutation((name: string) => documentsApi.rename(id, name))
}

export function useDeleteDocumentFile(id: number) {
  return useDocumentMutation((fileId: number) => documentsApi.deleteFile(id, fileId))
}

export function useDeleteDocument() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => documentsApi.destroy(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: detailKey(id) })
      return queryClient.invalidateQueries({ queryKey: [...documentsKey, 'list'] })
    },
  })
}
