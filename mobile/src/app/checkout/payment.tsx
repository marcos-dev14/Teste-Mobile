import { router } from 'expo-router'
import { View } from 'react-native'

import { CheckoutLayout } from '@/features/checkout/checkout-layout'
import { useCheckout } from '@/features/checkout/store'
import { PAYMENT_LABELS } from '@/features/orders/api'
import type { PaymentMethod } from '@/lib/api/types'
import { haptics } from '@/lib/haptics'
import { Button, Card, Icon, makeStyles, PressableScale, Text, useStyles, type IconName } from '@/ui'

const OPTIONS: { value: PaymentMethod; icon: IconName; description: string }[] = [
  { value: 'pix', icon: 'flash-outline', description: 'Confirmação imediata.' },
  { value: 'credit_card', icon: 'card-outline', description: 'Os dados do cartão seriam coletados por um provedor de pagamento.' },
  { value: 'boleto', icon: 'barcode-outline', description: 'Compensação em até 2 dias úteis.' },
]

export default function CheckoutPaymentScreen() {
  const styles = useStyles(styleFactory)
  const method = useCheckout((state) => state.paymentMethod)
  const setMethod = useCheckout((state) => state.setPaymentMethod)

  return (
    <CheckoutLayout
      step={1}
      title="Como prefere pagar?"
      footer={<Button title="Revisar pedido" onPress={() => router.push('/checkout/review')} fullWidth />}
    >
      <View style={styles.list} accessibilityRole="radiogroup" accessibilityLabel="Forma de pagamento">
        {OPTIONS.map((option) => {
          const selected = option.value === method
          return (
            <PressableScale
              key={option.value}
              onPress={() => {
                void haptics.selection()
                setMethod(option.value)
              }}
              scaleTo={0.99}
              accessibilityRole="radio"
              accessibilityState={{ selected, checked: selected }}
              accessibilityLabel={`${PAYMENT_LABELS[option.value]}. ${option.description}`}
              style={[styles.option, selected && styles.selected]}
            >
              <View style={styles.iconWrap}>
                <Icon name={option.icon} size={20} />
              </View>
              <View style={styles.text}>
                <Text variant="bodyStrong">{PAYMENT_LABELS[option.value]}</Text>
                <Text variant="caption" color="textMuted">
                  {option.description}
                </Text>
              </View>
              <Icon name={selected ? 'radio-button-on' : 'radio-button-off'} size={22} color={selected ? 'text' : 'borderStrong'} />
            </PressableScale>
          )
        })}
      </View>

      <Card style={styles.notice}>
        <Icon name="shield-checkmark-outline" size={20} color="success" />
        <Text variant="caption" color="textMuted" style={styles.text}>
          Ambiente de demonstração: nenhum pagamento real é processado e o app não coleta dados de cartão.
        </Text>
      </Card>
    </CheckoutLayout>
  )
}

const styleFactory = makeStyles((t) => ({
  list: { gap: t.space.sm },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space.sm,
    padding: t.space.md,
    borderRadius: t.radius.lg,
    borderWidth: 1.5,
    borderColor: t.colors.border,
    backgroundColor: t.colors.surface,
  },
  selected: { borderColor: t.colors.primary },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1, gap: 2 },
  notice: { flexDirection: 'row', gap: t.space.sm, alignItems: 'center' },
}))
