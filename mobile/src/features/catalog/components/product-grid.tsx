import type { InfiniteData, UseInfiniteQueryResult } from '@tanstack/react-query'
import { useCallback, useMemo, type ReactElement } from 'react'
import { ActivityIndicator, FlatList, RefreshControl, useWindowDimensions, View } from 'react-native'

import type { Paginated, ProductSummary } from '@/lib/api/types'
import { EmptyState, ErrorState, makeStyles, useStyles, useTheme } from '@/ui'

import { ProductCard, ProductCardSkeleton } from './product-card'

/** Colunas por largura disponível (celular → tablet). */
export function columnsFor(width: number): number {
  if (width >= 900) return 4
  if (width >= 600) return 3
  return 2
}

interface ProductGridProps {
  query: UseInfiniteQueryResult<InfiniteData<Paginated<ProductSummary>>>
  header?: ReactElement
  empty: { title: string; message?: string; actionLabel?: string; onAction?: () => void }
  bottomInset?: number
}

export function ProductGrid({ query, header, empty, bottomInset = 0 }: ProductGridProps) {
  const styles = useStyles(styleFactory)
  const theme = useTheme()
  const { width } = useWindowDimensions()
  const columns = columnsFor(width)
  const gutter = width >= 600 ? theme.layout.gutterWide : theme.layout.gutter
  const gap = theme.space.md
  const itemWidth = Math.floor((width - gutter * 2 - gap * (columns - 1)) / columns)

  const products = useMemo(() => query.data?.pages.flatMap((page) => page.data) ?? [], [query.data])

  const renderItem = useCallback(
    ({ item, index }: { item: ProductSummary; index: number }) => (
      <ProductCard product={item} width={itemWidth} index={index} />
    ),
    [itemWidth],
  )

  const { hasNextPage, isFetchingNextPage, fetchNextPage } = query
  const onEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  let emptyComponent: ReactElement
  if (query.isPending) {
    emptyComponent = (
      <View style={[styles.row, { gap }]} testID="product-grid-loading">
        {Array.from({ length: columns * 2 }, (_, index) => (
          <ProductCardSkeleton key={index} width={itemWidth} />
        ))}
      </View>
    )
  } else if (query.isError) {
    emptyComponent = <ErrorState error={query.error} onRetry={() => void query.refetch()} />
  } else {
    emptyComponent = <EmptyState icon="search-outline" {...empty} />
  }

  return (
    <FlatList
      // Trocar o número de colunas exige remontar a lista.
      key={`grid-${columns}`}
      data={products}
      numColumns={columns}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      columnWrapperStyle={{ gap }}
      contentContainerStyle={[
        styles.content,
        { paddingHorizontal: gutter, paddingBottom: bottomInset + theme.space.xl, gap: theme.space.xl },
      ]}
      ListHeaderComponent={header}
      ListEmptyComponent={emptyComponent}
      ListFooterComponent={isFetchingNextPage ? <ActivityIndicator color={theme.colors.textMuted} /> : null}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      refreshControl={
        <RefreshControl
          refreshing={query.isRefetching && !isFetchingNextPage}
          onRefresh={() => void query.refetch()}
          tintColor={theme.colors.textMuted}
          colors={[theme.colors.accent]}
        />
      }
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={false}
      removeClippedSubviews
      initialNumToRender={6}
      windowSize={7}
    />
  )
}

const styleFactory = makeStyles(() => ({
  content: { flexGrow: 1 },
  row: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 24 },
}))
