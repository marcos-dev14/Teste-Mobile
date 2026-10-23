import { router } from 'expo-router'
import { FlatList, View } from 'react-native'

import { AddressSummary } from '@/features/addresses/address-card'
import { useAddresses, useDeleteAddress } from '@/features/addresses/api'
import { RequireAuth } from '@/features/auth/require-auth'
import { describeError } from '@/lib/api/errors'
import type { Address } from '@/lib/api/types'
import { AppHeader, ScreenTitle, Button, Card, EmptyState, ErrorState, IconButton, LoadingState, makeStyles, Reveal, Screen, useConfirm, useStyles, useToast } from '@/ui'

export default function AddressesScreen() {
  const styles = useStyles(styleFactory)
  const toast = useToast()
  const confirm = useConfirm()
  const addresses = useAddresses()
  const remove = useDeleteAddress()

  const confirmRemove = async (address: Address) => {
    const confirmed = await confirm({
      title: 'Remover endereço?',
      message: `${address.addressLine1}, ${address.city}`,
      confirmLabel: 'Remover',
      tone: 'danger',
      icon: 'trash-outline',
    })
    if (!confirmed) return
    remove.mutate(address.id, {
      onSuccess: () => toast.show({ tone: 'success', message: 'Endereço removido.' }),
      onError: (error) => toast.show({ tone: 'error', message: describeError(error).message }),
    })
  }

  return (
    <RequireAuth>
      <Screen>
        <AppHeader back fallbackHref="/profile" />
        <FlatList
          data={addresses.data ?? []}
          keyExtractor={(address) => address.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={<ScreenTitle title="Endereços" />}
          renderItem={({ item, index }) => (
            <Reveal index={1 + index} once={`address-${index}`}>
              <Card style={styles.card}>
                <View style={styles.flex}>
                  <AddressSummary address={item} />
                </View>
                <IconButton icon="trash-outline" accessibilityLabel={`Remover endereço ${item.addressLine1}`} color="danger" onPress={() => void confirmRemove(item)} />
              </Card>
            </Reveal>
          )}
          ListEmptyComponent={
            addresses.isPending ? (
              <LoadingState layout="inline" label="Carregando endereços" />
            ) : addresses.isError ? (
              <ErrorState error={addresses.error} onRetry={() => void addresses.refetch()} />
            ) : (
              <EmptyState icon="location-outline" title="Nenhum endereço" message="Cadastre um endereço para agilizar suas compras." />
            )
          }
          ListFooterComponent={
            <Reveal index={1 + Math.min(addresses.data?.length ?? 0, 4)} style={styles.add}>
              <Button title="Adicionar endereço" icon="add" variant="secondary" onPress={() => router.push('/addresses/new')} />
            </Reveal>
          }
        />
      </Screen>
    </RequireAuth>
  )
}

const styleFactory = makeStyles((t) => ({
  list: { flexGrow: 1, paddingHorizontal: t.layout.gutter, paddingBottom: t.space.xxl, gap: t.space.sm },
  card: { flexDirection: 'row', alignItems: 'flex-start', gap: t.space.sm },
  flex: { flex: 1 },
  add: { marginTop: t.space.md },
}))
