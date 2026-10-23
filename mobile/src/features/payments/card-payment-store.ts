import { create } from 'zustand'

import type { CardPaymentSession, PaymentSheetOutcome } from './payment-sheet-types'

interface CardPaymentRequest {
  session: CardPaymentSession
  resolve: (outcome: PaymentSheetOutcome) => void
}

/**
 * Ponte entre o fluxo de pagamento (mutations, fora da árvore de componentes) e o painel de
 * cartão do app, montado uma vez na raiz (`CardPaymentHost`).
 */
export const useCardPayment = create<{ request: CardPaymentRequest | null }>(() => ({ request: null }))

/** Abre o painel de cartão e resolve quando o cliente paga ou fecha. Um pedido por vez. */
export function requestCardPayment(session: CardPaymentSession): Promise<PaymentSheetOutcome> {
  useCardPayment.getState().request?.resolve({ kind: 'canceled' })
  return new Promise((resolve) => {
    useCardPayment.setState({
      request: {
        session,
        resolve: (outcome) => {
          useCardPayment.setState({ request: null })
          resolve(outcome)
        },
      },
    })
  })
}
