import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { settingsApi, type Settings } from '@/lib/api'

const settingsKey = ['settings'] as const

/** App-wide settings (brand name, tagline). Loaded once; updated in place when saved. */
export function useSettings() {
  return useQuery({ queryKey: settingsKey, queryFn: settingsApi.get, staleTime: Infinity })
}

export function useUpdateSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: Pick<Settings, 'brand_name' | 'tagline'>) => settingsApi.update(input),
    onSuccess: (settings) => queryClient.setQueryData(settingsKey, settings),
  })
}
