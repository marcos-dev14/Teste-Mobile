import { router } from 'expo-router'
import { memo, useMemo } from 'react'
import { ActivityIndicator, FlatList, RefreshControl, View } from 'react-native'

import { RequireAuth } from '@/features/auth/require-auth'
import { STATUS_LABELS, useOrders } from '@/features/orders/api'
import type { OrderSummary } from '@/lib/api/types'
import { formatDate, formatMoney, pluralize } from '@/lib/format'
import { AppHeader, Badge, EmptyState, ErrorState, Icon, makeStyles, PressableScale, Price, ProductImage, Screen, Skeleton, Text, useStyles, useTheme } from '@/ui'

const OrderCard = memo(function OrderCard({ order }: { order: OrderSummary }) {
  const styles = useStyles(styleFactory)
  const status = STATUS_LABELS[order.status]
  return (
    <PressableScale
      onPress={() => router.push({ pathname: '/orders/[id]', params: { id: order.id } })}
      scaleTo={0.99}
      accessibilityRole="button"
      accessibilityLabel={`Pedido ${order.number}, ${status.label}, ${formatDate(order.createdAt)}, ${formatMoney(order.totalCents)}`}
      style={styles.card}
    >
      <View style={styles.cardHeader}>
        <View>
          <Text variant="bodyStrong">Pedido #{order.number}</Text>
          <Text variant="caption" color="textMuted">
            {formatDate(order.createdAt)}
          </Text>
        </View>
        <Badge label={status.label} tone={status.tone} />
      </View>
      <View style={styles.cardBody}>
        <View style={styles.thumbs}>
          {order.previewImageUrls.map((uri, index) => (
            <View key={`${uri}-${index}`} style={styles.thumb}>
              <ProductImage uri={uri} aspectRatio={1} />
            </View>
          ))}
        </View>
        <View style={styles.total}>
          <Text variant="caption" color="textMuted">
            {pluralize(order.itemCount, 'item', 'itens')}
          </Text>
          <Price cents={order.totalCents} />
        </View>
        <Icon name="chevron-forward" size={18} color="textMuted" />
      </View>
    </PressableScale>
  )
})

export default function OrdersScreen() {
  const styles = useStyles(styleFactory)
  const theme = useTheme()
  const query = useOrders()
  const orders = useMemo(() => query.data?.pages.flatMap((page) => page.data) ?? [], [query.data])

  return (
    <RequireAuth>
      <Screen>
        <AppHeader back fallbackHref="/profile" />
        <FlatList
          data={orders}
          keyExtractor={(order) => order.id}
          renderItem={({ item }) => <OrderCard order={item} />}
          ListHeaderComponent={<AppHeader largeTitle="Meus pedidos" />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            query.isPending ? (
              <View style={styles.gap}>
                {[0, 1, 2].map((key) => (
                  <Skeleton key={key} height={120} radius={20} />
                ))}
              </View>
            ) : query.isError ? (
              <ErrorState error={query.error} onRetry={() => void query.refetch()} />
            ) : (
              <EmptyState
                icon="receipt-outline"
                title="Nenhum pedido ainda"
                message="Quando você finalizar uma compra, ela aparece aqui."
                actionLabel="Explorar produtos"
                onAction={() => router.navigate('/')}
              />
            )
          }
          onEndReached={() => query.hasNextPage && !query.isFetchingNextPage && void query.fetchNextPage()}
          ListFooterComponent={query.isFetchingNextPage ? <ActivityIndicator color={theme.colors.textMuted} /> : null}
          refreshControl={
            <RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} tintColor={theme.colors.textMuted} />
          }
        />
      </Screen>
    </RequireAuth>
  )
}

const styleFactory = makeStyles((t) => ({
  list: { flexGrow: 1, paddingHorizontal: t.layout.gutter, paddingBottom: t.space.xxl, gap: t.space.sm },
  gap: { gap: t.space.sm },
  card: {
    padding: t.space.md,
    gap: t.space.sm,
    borderRadius: t.radius.lg,
    backgroundColor: t.colors.surface,
    borderWidth: 1,
    borderColor: t.colors.border,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardBody: { flexDirection: 'row', alignItems: 'center', gap: t.space.sm },
  thumbs: { flexDirection: 'row', gap: t.space.xxs, flex: 1 },
  thumb: { width: 48 },
  total: { alignItems: 'flex-end' },
}))
