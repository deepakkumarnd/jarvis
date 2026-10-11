import { useQuery } from '@tanstack/react-query'
import { checkBackendHealth, type HealthStatus } from '@/lib/api'

const healthKey = ['backend-health'] as const

/** Polls GET /up every 5s; each sample is compared with the previous one to derive throughput rates. */
export function useBackendHealth() {
  return useQuery({
    queryKey: healthKey,
    queryFn: ({ client }) => checkBackendHealth(client.getQueryData<HealthStatus>(healthKey)),
    refetchInterval: 5_000,
    retry: false,
  })
}
