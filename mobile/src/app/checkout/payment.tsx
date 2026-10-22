import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import { View } from 'react-native'

import { CheckoutLayout, CONTENT_ENTRANCE } from '@/features/checkout/checkout-layout'
import { useCheckout } from '@/features/checkout/store'
import { PAYMENT_LABELS } from '@/features/orders/api'
import { isAsyncMethod, usePaymentMethods } from '@/features/payments/api'
import { TaxIdField } from '@/features/payments/async-payment'
import type { PaymentMethod } from '@/lib/api/types'
import { haptics } from '@/lib/haptics'
import { isValidTaxId } from '@/lib/tax-id'
import { Button, Card, ErrorState, Icon, LoadingState, makeStyles, PressableScale, Reveal, Text, useStyles, type IconName } from '@/ui'

const OPTIONS: { value: PaymentMethod; icon: IconName; description: string }[] = [
  { value: 'credit_card', icon: 'card-outline', description: 'Digitado na tela segura do Stripe; o app não vê os dados do cartão.' },
  { value: 'pix', icon: 'flash-outline', description: 'QR Code ou "copia e cola". Confirmação em instantes.' },
  { value: 'boleto', icon: 'barcode-outline', description: 'Vence em alguns dias; a confirmação leva até 1 dia útil após o pagamento.' },
]

const TEST_NOTICE: Record<PaymentMethod, string> = {
  credit_card: 'Ambiente de teste do Stripe: nenhuma cobrança real. Use o cartão 4242 4242 4242 4242, qualquer validade futura e qualquer CVC.',
  pix: 'Ambiente de teste do Stripe: o Pix é simulado e nenhum valor é cobrado. CPF de teste: 000.000.000-00.',
  boleto: 'Ambiente de teste do Stripe: o boleto é simulado e nenhum valor é cobrado. CPF de teste: 000.000.000-00.',
}

export default function CheckoutPaymentScreen() {
  const styles = useStyles(styleFactory)
  const stored = useCheckout((state) => state.paymentMethod)
  const setMethod = useCheckout((state) => state.setPaymentMethod)
  const taxId = useCheckout((state) => state.taxId)
  const setTaxId = useCheckout((state) => state.setTaxId)
  const methods = usePaymentMethods()
  const [touched, setTouched] = useState(false)

  // A revisão é empilhada sobre esta tela; ao sair do checkout ela desmonta e o CPF/CNPJ é descartado.
  useEffect(() => () => useCheckout.getState().clearTaxId(), [])

  if (methods.isPending || methods.isError || methods.data.methods.length === 0) {
    return (
      <CheckoutLayout step={1} title="Como prefere pagar?">
        {methods.isPending ? (
          <LoadingState layout="inline" label="Carregando formas de pagamento" />
        ) : (
          <ErrorState error={methods.error} onRetry={() => void methods.refetch()} />
        )}
      </CheckoutLayout>
    )
  }

  // Só o que o servidor oferece (conforme a conta Stripe); a escolha salva cai para o primeiro disponível.
  const { methods: available, testMode } = methods.data
  const method = available.includes(stored) ? stored : available[0]!
  const needsTaxId = isAsyncMethod(method)
  // CPF/CNPJ de teste do Stripe só quando o servidor está em modo de teste (não depende do tipo de build).
  const taxIdValid = isValidTaxId(taxId, { allowTestIds: testMode })

  const goToReview = () => {
    setTouched(true)
    if (needsTaxId && !taxIdValid) return
    setMethod(method)
    router.push('/checkout/review')
  }

  return (
    <CheckoutLayout
      step={1}
      title="Como prefere pagar?"
      footer={<Button title="Revisar pedido" onPress={goToReview} fullWidth testID="review-order" />}
    >
      <Reveal index={CONTENT_ENTRANCE}>
        <View style={styles.list} accessibilityRole="radiogroup" accessibilityLabel="Forma de pagamento">
          {OPTIONS.filter((option) => available.includes(option.value)).map((option) => {
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
                testID={`method-${option.value}`}
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
      </Reveal>

      {needsTaxId ? (
        <Reveal index={CONTENT_ENTRANCE + 1} once="tax-id">
          <TaxIdField value={taxId} onChange={setTaxId} error={touched && !taxIdValid ? 'CPF ou CNPJ inválido.' : undefined} />
        </Reveal>
      ) : null}

      {testMode ? (
        <Reveal index={CONTENT_ENTRANCE + 2}>
          <Card style={styles.notice}>
            <Icon name="shield-checkmark-outline" size={20} color="success" />
            <Text variant="caption" color="textMuted" style={styles.text}>
              {TEST_NOTICE[method]}
            </Text>
          </Card>
        </Reveal>
      ) : null}
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
