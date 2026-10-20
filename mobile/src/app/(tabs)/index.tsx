import { router } from 'expo-router'
import { View } from 'react-native'

import { useCurrentUser } from '@/features/auth/require-auth'
import { ProductGrid } from '@/features/catalog/components/product-grid'
import { useProductList } from '@/features/catalog/hooks'
import { IconButton, makeStyles, PressableScale, Screen, Text, useStyles } from '@/ui'

export default function HomeScreen() {
  const styles = useStyles(styleFactory)
  const user = useCurrentUser()
  const query = useProductList({ sort: 'featured' })
  const total = query.data?.pages[0]?.total

  const header = (
    <View style={styles.header}>
      <View style={styles.topBar}>
        <Text variant="title" accessibilityRole="header">
          Vesti
        </Text>
        <IconButton icon="search" accessibilityLabel="Buscar produtos" onPress={() => router.navigate('/search')} />
      </View>

      <View style={styles.hero}>
        <Text variant="overline" color="accent" uppercase>
          {user ? `Olá, ${user.name.split(' ')[0]}` : 'Coleção essencial'}
        </Text>
        <Text variant="display">Básicos que{'\n'}duram.</Text>
        <Text variant="body" color="textMuted" style={styles.heroText}>
          Algodão, jeans e acessórios escolhidos para o dia a dia — com preço e estoque sempre atualizados.
        </Text>
        <PressableScale
          onPress={() => router.navigate('/search')}
          accessibilityRole="button"
          accessibilityLabel="Ver todos os produtos"
          style={styles.heroLink}
        >
          <Text variant="bodyStrong" style={styles.underline}>
            Ver todos os produtos
          </Text>
        </PressableScale>
      </View>

      <View style={styles.sectionTitle}>
        <Text variant="headline" accessibilityRole="header">
          Destaques
        </Text>
        {total !== undefined ? (
          <Text variant="caption" color="textMuted">
            {total} {total === 1 ? 'peça' : 'peças'}
          </Text>
        ) : null}
      </View>
    </View>
  )

  return (
    <Screen>
      <ProductGrid
        query={query}
        header={header}
        empty={{ title: 'Catálogo vazio', message: 'Nenhum produto disponível no momento.' }}
      />
    </Screen>
  )
}

const styleFactory = makeStyles((t) => ({
  header: { gap: t.space.lg, paddingBottom: t.space.xs },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: t.space.xs },
  hero: {
    gap: t.space.xs,
    padding: t.space.xl,
    borderRadius: t.radius.lg,
    backgroundColor: t.colors.surfaceMuted,
  },
  heroText: { maxWidth: 360 },
  heroLink: { alignSelf: 'flex-start', minHeight: t.layout.minTouch, justifyContent: 'center' },
  underline: { textDecorationLine: 'underline' },
  sectionTitle: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
}))
