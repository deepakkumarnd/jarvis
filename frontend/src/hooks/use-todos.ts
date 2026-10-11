import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { todosApi, type Todo, type TodoInput, type TodoListMeta, type TodoStatus } from '@/lib/api'

const todosKey = ['todos'] as const
type TodoPage = { data: Todo[]; meta: TodoListMeta }

export function useTodos(status: TodoStatus, page: number) {
  return useQuery({
    queryKey: [...todosKey, { status, page }],
    queryFn: () => todosApi.list(status, page),
    placeholderData: keepPreviousData,
  })
}

export function useCreateTodo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: TodoInput) => todosApi.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: todosKey }),
  })
}

/** Updates a todo, applying the change to cached lists immediately (e.g. ticking a checkbox) and rolling back on error. */
export function useUpdateTodo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: TodoInput }) => todosApi.update(id, input),
    onMutate: async ({ id, input }) => {
      await queryClient.cancelQueries({ queryKey: todosKey })
      const snapshot = queryClient.getQueriesData<TodoPage>({ queryKey: todosKey })
      queryClient.setQueriesData<TodoPage>({ queryKey: todosKey }, (page) =>
        page && { ...page, data: page.data.map((todo) => (todo.id === id ? { ...todo, ...input } : todo)) },
      )
      return { snapshot }
    },
    onError: (_error, _variables, context) => {
      context?.snapshot.forEach(([key, data]) => queryClient.setQueryData(key, data))
    },
    // Refetch so ordering, filters and counts reflect the change
    onSettled: () => queryClient.invalidateQueries({ queryKey: todosKey }),
  })
}

export function useDeleteTodo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => todosApi.destroy(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: todosKey }),
  })
}

export function useClearCompletedTodos() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => todosApi.destroyCompleted(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: todosKey }),
  })
}
