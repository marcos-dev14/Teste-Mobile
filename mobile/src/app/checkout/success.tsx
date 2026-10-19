import { router, useLocalSearchParams } from 'expo-router'
import { useEffect } from 'react'
import { BackHandler, View } from 'react-native'
import Animated, { ReduceMotion, ZoomIn } from 'react-native-reanimated'

import { Button, Icon, makeStyles, Screen, Text, useStyles } from '@/ui'

export default function OrderSuccessScreen() {
  const styles = useStyles(styleFactory)
  const { orderId, number } = useLocalSearchParams<{ orderId: string; number?: string }>()

  // Voltar a partir da confirmação leva ao início, nunca de volta ao checkout.
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      router.dismissAll()
      return true
    })
    return () => subscription.remove()
  }, [])

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={styles.content}>
        <Animated.View entering={ZoomIn.springify().damping(14).reduceMotion(ReduceMotion.System)} style={styles.seal}>
          <Icon name="checkmark" size={44} color="onPrimary" />
        </Animated.View>
        <Text variant="display" align="center" accessibilityRole="header">
          Pedido confirmado
        </Text>
        {number ? (
          <Text variant="headline" color="accent" align="center">
            #{number}
          </Text>
        ) : null}
        <Text variant="body" color="textMuted" align="center" style={styles.message}>
          Recebemos seu pedido e ele já está em preparação. Você pode acompanhar o status em “Meus pedidos”.
        </Text>
      </View>
      <View style={styles.actions}>
        <Button
          title="Ver detalhes do pedido"
          onPress={() => {
            router.dismissAll()
            router.push({ pathname: '/orders/[id]', params: { id: orderId } })
          }}
          fullWidth
        />
        <Button title="Continuar comprando" variant="ghost" onPress={() => router.dismissAll()} fullWidth />
      </View>
    </Screen>
  )
}

const styleFactory = makeStyles((t) => ({
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: t.space.md, paddingHorizontal: t.space.xl },
  seal: {
    width: 96,
    height: 96,
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: t.space.md,
  },
  message: { maxWidth: 340 },
  actions: { paddingHorizontal: t.layout.gutter, paddingBottom: t.space.md, gap: t.space.xs },
}))
