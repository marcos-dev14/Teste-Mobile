import { CardActionError, handleNextAction } from '@stripe/stripe-react-native'
import * as Linking from 'expo-linking'
import { useRef, useState } from 'react'
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from 'react-native'
import Animated from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useSession } from '@/features/auth/session-store'
import { formatMoney } from '@/lib/format'
import { haptics } from '@/lib/haptics'
import { backdropIn, Button, Icon, IconButton, makeStyles, Price, sheetIn, Text, TextField, useStyles, useTheme } from '@/ui'

import { cardErrorMessage, usePaymentMethods } from './api'
import { useCardPayment } from './card-payment-store'
import type { CardPaymentSession, PaymentSheetOutcome } from './payment-sheet-types'
import { StripeCardFields, type StripeCardFieldsHandle } from './stripe-card-fields'

/** Status em que o Stripe já aceitou o cartão (a confirmação final vem do servidor). */
const ACCEPTED = new Set(['succeeded', 'processing', 'requires_capture'])

/**
 * Confirma no Stripe.js e, se o banco exigir 3DS, apresenta a autenticação pelo SDK nativo
 * (em tela cheia, fora do painel). Devolve `null` quando aceito ou o texto do erro.
 */
async function confirmCard(fields: StripeCardFieldsHandle, clientSecret: string, name: string): Promise<string | null> {
  const result = await fields.confirm(clientSecret, name)
  if ('error' in result) {
    // Erros de preenchimento já vêm em português do Stripe.js (locale pt-BR).
    if (result.error.type === 'validation_error' && result.error.message) return result.error.message
    return cardErrorMessage(result.error.declineCode ?? result.error.code)
  }
  if (result.status !== 'requires_action') return ACCEPTED.has(result.status) ? null : cardErrorMessage(undefined)

  const action = await handleNextAction(clientSecret, Linking.createURL('stripe-redirect'))
  if (action.error) {
    return action.error.code === CardActionError.Canceled
      ? 'A autenticação do cartão foi cancelada. Tente novamente.'
      : cardErrorMessage(action.error.declineCode ?? action.error.stripeErrorCode)
  }
  return String(action.paymentIntent.status) === 'RequiresPaymentMethod' ? cardErrorMessage('payment_intent_authentication_failure') : null
}

/** Painel de cartão do app, montado uma vez na raiz. Abre quando `payWithCard` é chamado. */
export function CardPaymentHost() {
  const request = useCardPayment((state) => state.request)
  // `key`: cada pagamento começa com o formulário limpo.
  return request ? <CardPaymentForm key={request.session.paymentIntentId} session={request.session} onDone={request.resolve} /> : null
}

function CardPaymentForm({ session, onDone }: { session: CardPaymentSession; onDone: (outcome: PaymentSheetOutcome) => void }) {
  const styles = useStyles(styleFactory)
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const testMode = usePaymentMethods().data?.testMode ?? false
  const [name, setName] = useState(() => useSession.getState().user?.name ?? '')
  const fields = useRef<StripeCardFieldsHandle>(null)
  const [cardComplete, setCardComplete] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const nameValid = name.trim().length >= 3
  const close = () => {
    if (!submitting) onDone({ kind: 'canceled' })
  }

  const pay = async () => {
    if (!cardComplete || !nameValid || submitting || !fields.current) return
    setSubmitting(true)
    setError(null)
    const failure = await confirmCard(fields.current, session.clientSecret, name.trim())
    setSubmitting(false)
    if (failure === null) {
      onDone({ kind: 'completed' })
      return
    }
    void haptics.error()
    // Recusa não fecha o painel: o cliente pode corrigir ou trocar de cartão no mesmo pedido.
    setError(failure)
  }

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={close}>
      <View style={styles.root}>
        <Animated.View entering={backdropIn} style={styles.backdrop}>
          <Pressable style={styles.fill} onPress={close} accessibilityRole="button" accessibilityLabel="Fechar pagamento" />
        </Animated.View>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} pointerEvents="box-none">
          <Animated.View
            entering={sheetIn}
            style={[styles.sheet, { paddingBottom: insets.bottom + theme.space.md }]}
            accessibilityViewIsModal
            testID="card-payment-sheet"
          >
            <View style={styles.handle} />
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content} bounces={false}>
              <View style={styles.header}>
                <Text variant="title" accessibilityRole="header">
                  Pagamento com cartão
                </Text>
                <IconButton
                  icon="close"
                  accessibilityLabel="Fechar pagamento"
                  variant="surface"
                  onPress={close}
                  disabled={submitting}
                  testID="card-close"
                />
              </View>

              <View style={styles.total}>
                <Text variant="body" color="textMuted">
                  Total do pedido
                </Text>
                <Price cents={session.amountCents} variant="priceLarge" />
              </View>

              {testMode ? (
                <View style={styles.testNote}>
                  <Icon name="flask-outline" size={16} color="warning" />
                  <Text variant="caption" color="warning" style={styles.flex}>
                    Modo de teste: use 4242 4242 4242 4242, validade futura e qualquer CVC.
                  </Text>
                </View>
              ) : null}

              <TextField
                label="Nome impresso no cartão"
                value={name}
                onChangeText={setName}
                autoCapitalize="characters"
                autoComplete="name"
                autoCorrect={false}
                editable={!submitting}
                testID="card-name"
              />

              <StripeCardFields
                ref={fields}
                publishableKey={session.publishableKey}
                disabled={submitting}
                onCompleteChange={(complete) => {
                  setCardComplete(complete)
                  if (error) setError(null)
                }}
                onLoadError={() => setError('Não foi possível carregar os campos do cartão. Verifique a conexão e tente de novo.')}
              />

              {error ? (
                <View style={styles.errorRow} accessibilityLiveRegion="polite">
                  <Icon name="alert-circle" size={18} color="danger" />
                  <Text variant="label" color="danger" style={styles.flex} testID="card-error">
                    {error}
                  </Text>
                </View>
              ) : null}

              <Button
                title={`Pagar ${formatMoney(session.amountCents)}`}
                icon="lock-closed"
                loading={submitting}
                disabled={!cardComplete || !nameValid}
                onPress={() => void pay()}
                fullWidth
                testID="card-pay"
              />

              <View style={styles.secure}>
                <Icon name="shield-checkmark-outline" size={16} color="textMuted" />
                <Text variant="caption" color="textMuted" style={styles.flex}>
                  Os dados do cartão vão criptografados direto para o Stripe. A Vesti não vê nem guarda o número do cartão.
                </Text>
              </View>
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  )
}

const styleFactory = makeStyles((t) => ({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: t.colors.overlay,
  },
  fill: { flex: 1 },
  sheet: {
    maxHeight: '92%',
    alignSelf: 'center',
    width: '100%',
    maxWidth: t.layout.maxContentWidth,
    paddingTop: t.space.xs,
    borderTopLeftRadius: t.radius.lg,
    borderTopRightRadius: t.radius.lg,
    backgroundColor: t.colors.bg,
    ...t.elevation.floating,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.borderStrong,
  },
  content: {
    gap: t.space.md,
    paddingHorizontal: t.layout.gutterWide,
    paddingTop: t.space.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: t.space.sm,
  },
  total: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: t.space.md,
    borderRadius: t.radius.md,
    backgroundColor: t.colors.surfaceMuted,
  },
  testNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space.xs,
    paddingVertical: t.space.xs,
    paddingHorizontal: t.space.sm,
    borderRadius: t.radius.sm,
    backgroundColor: t.colors.warningSoft,
  },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: t.space.xs },
  secure: { flexDirection: 'row', alignItems: 'flex-start', gap: t.space.xs },
  flex: { flex: 1 },
}))
