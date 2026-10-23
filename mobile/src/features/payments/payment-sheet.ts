import { initStripe } from '@stripe/stripe-react-native'
import Constants from 'expo-constants'
import * as Linking from 'expo-linking'

import { requestCardPayment } from './card-payment-store'
import type { CardPaymentSession, PaymentSheetOutcome } from './payment-sheet-types'

export type { CardPaymentSession, PaymentSheetOutcome } from './payment-sheet-types'

// Nativo (iOS/Android). Na web, o Metro usa `payment-sheet.web.ts` (o SDK do Stripe é só nativo).

/** Esquema para voltar ao app após autenticação no navegador (3DS); no Expo Go é o do Expo. */
function urlScheme(): string {
  return Constants.appOwnership === 'expo' ? Linking.createURL('/--/') : Linking.createURL('')
}

/**
 * Cartão no painel do próprio app (`CardPaymentHost`). Os dados do cartão ficam no campo nativo
 * do Stripe e vão direto para ele: nem o JS do app nem a nossa API os veem.
 */
export async function payWithCard(session: CardPaymentSession): Promise<PaymentSheetOutcome> {
  // Defesa em profundidade: o servidor já recusa chaves live, e o app também.
  if (!session.publishableKey.startsWith('pk_test_')) {
    return { kind: 'failed', message: 'Pagamentos reais estão desativados neste ambiente.' }
  }
  await initStripe({ publishableKey: session.publishableKey, urlScheme: urlScheme() })
  return requestCardPayment(session)
}
