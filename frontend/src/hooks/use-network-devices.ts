import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { networkApi } from '@/lib/api'

const networkDevicesKey = ['network-devices'] as const

/** Devices on the LAN, rescanned every minute (each scan takes a couple of seconds). */
export function useNetworkDevices() {
  return useQuery({
    queryKey: networkDevicesKey,
    queryFn: () => networkApi.devices(),
    refetchInterval: 60_000,
    staleTime: 30_000,
    retry: false,
  })
}

/** Runs a fresh scan, bypassing the backend's cache, and shows its result. */
export function useRescanNetwork() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => networkApi.devices(true),
    onSuccess: (scan) => queryClient.setQueryData(networkDevicesKey, scan),
  })
}
