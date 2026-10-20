import { router, useLocalSearchParams } from 'expo-router'
import { useEffect } from 'react'
import { BackHandler, View } from 'react-native'
import Animated, { ReduceMotion, ZoomIn } from 'react-native-reanimated'

import { Button, Icon, makeStyles, Reveal, Screen, Text, useStyles } from '@/ui'

/** Sai da confirmação para as abas, mesmo quando a tela foi aberta sem pilha (deep link). */
function leaveTo(href: '/' | { pathname: '/orders/[id]'; params: { id: string } }) {
  if (router.canDismiss()) router.dismissAll()
  if (href === '/') router.navigate('/')
  else router.push(href)
}

export default function OrderSuccessScreen() {
  const styles = useStyles(styleFactory)
  const { orderId, number } = useLocalSearchParams<{ orderId: string; number?: string }>()

  // Voltar a partir da confirmação leva ao início, nunca de volta ao checkout.
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      leaveTo('/')
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
        <Reveal index={1} style={styles.copy}>
          <Text variant="display" align="center" accessibilityRole="header">
            Pedido recebido
          </Text>
          {number ? (
            <Text variant="headline" color="accent" align="center">
              #{number}
            </Text>
          ) : null}
          <Text variant="body" color="textMuted" align="center" style={styles.message}>
            {/* Sem confirmação de pagamento pelo servidor, o app não afirma que o pedido foi pago ou está em preparação. */}
            Recebemos seu pedido. Neste ambiente de demonstração o pagamento é simulado: nenhuma cobrança foi feita. Acompanhe o status em “Meus pedidos”.
          </Text>
        </Reveal>
      </View>
      <Reveal index={2} style={styles.actions}>
        <Button
          title="Ver detalhes do pedido"
          onPress={() => {
            leaveTo({ pathname: '/orders/[id]', params: { id: orderId } })
          }}
          fullWidth
        />
        <Button title="Continuar comprando" variant="ghost" onPress={() => leaveTo('/')} fullWidth />
      </Reveal>
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
  copy: { alignItems: 'center', gap: t.space.md },
  message: { maxWidth: 340 },
  actions: { paddingHorizontal: t.layout.gutter, paddingBottom: t.space.md, gap: t.space.xs },
}))
