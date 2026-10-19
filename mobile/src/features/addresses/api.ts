import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useCurrentUser } from '@/features/auth/require-auth'
import { api } from '@/lib/api/client'
import type { Address, NewAddress } from '@/lib/api/types'
import { queryKeys } from '@/lib/query-keys'

export const addressesApi = {
  list: (signal?: AbortSignal) => api.get<{ data: Address[] }>('/v1/addresses', { auth: true, signal }),
  create: (input: NewAddress) => api.post<Address>('/v1/addresses', input, { auth: true }),
  remove: (id: string) => api.delete(`/v1/addresses/${id}`, { auth: true }),
}

export function useAddresses() {
  const user = useCurrentUser()
  return useQuery({
    queryKey: queryKeys.addresses(user?.id ?? 'anon'),
    queryFn: async ({ signal }) => (await addressesApi.list(signal)).data,
    enabled: !!user,
  })
}

export function useCreateAddress() {
  const user = useCurrentUser()
  const client = useQueryClient()
  return useMutation({
    mutationFn: addressesApi.create,
    onSuccess: () => client.invalidateQueries({ queryKey: queryKeys.addresses(user?.id ?? 'anon') }),
  })
}

export function useDeleteAddress() {
  const user = useCurrentUser()
  const client = useQueryClient()
  return useMutation({
    mutationFn: addressesApi.remove,
    onSuccess: () => client.invalidateQueries({ queryKey: queryKeys.addresses(user?.id ?? 'anon') }),
  })
}
