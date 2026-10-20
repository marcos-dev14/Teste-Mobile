import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'

import { useCurrentUser } from '@/features/auth/require-auth'
import { api } from '@/lib/api/client'
import type { Address, CreateAddressInput, ZipCodeLookup } from '@/lib/api/types'
import { queryKeys } from '@/lib/query-keys'

export const addressesApi = {
  list: (signal?: AbortSignal) => api.get<{ data: Address[] }>('/v1/addresses', { auth: true, signal }),
  create: (input: CreateAddressInput) => api.post<Address>('/v1/addresses', input, { auth: true }),
  // O servidor tenta dois provedores (até ~2,5 s cada): o tempo-limite cobre os dois.
  lookupZipCode: (digits: string) =>
    api.get<ZipCodeLookup>(`/v1/addresses/zip-codes/${digits}`, { auth: true, timeoutMs: 7_000 }),
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

/**
 * Consulta de CEP com cache do React Query: o mesmo CEP digitado de novo não gera outra requisição.
 * Sem retentativa automática: o servidor já tenta o provedor de fallback e o formulário segue manual.
 */
export function fetchZipCode(client: QueryClient, digits: string): Promise<ZipCodeLookup> {
  return client.fetchQuery({
    queryKey: queryKeys.zipCode(digits),
    queryFn: () => addressesApi.lookupZipCode(digits),
    staleTime: Infinity,
    retry: false,
  })
}
