import { useQuery } from '@tanstack/react-query'
import { checkBackendHealth } from '@/lib/api'

export function useBackendHealth() {
  return useQuery({
    queryKey: ['backend-health'],
    queryFn: checkBackendHealth,
    refetchInterval: 30_000,
    retry: false,
  })
}
