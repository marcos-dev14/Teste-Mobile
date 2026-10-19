import { router } from 'expo-router'
import { Alert, FlatList, View } from 'react-native'

import { AddressSummary } from '@/features/addresses/address-card'
import { useAddresses, useDeleteAddress } from '@/features/addresses/api'
import { RequireAuth } from '@/features/auth/require-auth'
import { describeError } from '@/lib/api/errors'
import type { Address } from '@/lib/api/types'
import { AppHeader, Button, Card, EmptyState, ErrorState, IconButton, makeStyles, Screen, Skeleton, useStyles, useToast } from '@/ui'

export default function AddressesScreen() {
  const styles = useStyles(styleFactory)
  const toast = useToast()
  const addresses = useAddresses()
  const remove = useDeleteAddress()

  const confirmRemove = (address: Address) =>
    Alert.alert('Remover endereço?', `${address.addressLine1}, ${address.city}`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: () =>
          remove.mutate(address.id, {
            onSuccess: () => toast.show({ tone: 'success', message: 'Endereço removido.' }),
            onError: (error) => toast.show({ tone: 'error', message: describeError(error).message }),
          }),
      },
    ])

  return (
    <RequireAuth>
      <Screen>
        <AppHeader back fallbackHref="/profile" />
        <FlatList
          data={addresses.data ?? []}
          keyExtractor={(address) => address.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={<AppHeader largeTitle="Endereços" />}
          renderItem={({ item }) => (
            <Card style={styles.card}>
              <View style={styles.flex}>
                <AddressSummary address={item} />
              </View>
              <IconButton icon="trash-outline" accessibilityLabel={`Remover endereço ${item.addressLine1}`} color="danger" onPress={() => confirmRemove(item)} />
            </Card>
          )}
          ListEmptyComponent={
            addresses.isPending ? (
              <Skeleton height={100} radius={20} />
            ) : addresses.isError ? (
              <ErrorState error={addresses.error} onRetry={() => void addresses.refetch()} />
            ) : (
              <EmptyState icon="location-outline" title="Nenhum endereço" message="Cadastre um endereço para agilizar suas compras." />
            )
          }
          ListFooterComponent={
            <Button title="Adicionar endereço" icon="add" variant="secondary" onPress={() => router.push('/addresses/new')} style={styles.add} />
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
