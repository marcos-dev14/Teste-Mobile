import type { CardPaymentSession, PaymentSheetOutcome } from './payment-sheet-types'

export type { CardPaymentSession, PaymentSheetOutcome } from './payment-sheet-types'

/**
 * Web: o SDK `@stripe/stripe-react-native` (PaymentSheet) é só nativo e quebraria o bundle web.
 * Cartão fica indisponível no navegador; Pix e boleto funcionam (são gerados pelo servidor).
 * O pedido continua aguardando pagamento e pode ser pago depois pelo app.
 */
export async function payWithCard(_session: CardPaymentSession): Promise<PaymentSheetOutcome> {
  return { kind: 'failed', message: 'Pagamento com cartão disponível apenas no aplicativo para celular.' }
}
