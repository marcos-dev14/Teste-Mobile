# Checkout, pagamento e Stripe (somente Test Mode)

## 1. Fluxo atual (inspecionado)

| Etapa | Onde | Autoridade | Situação |
|---|---|---|---|
| Seleção de cor/quantidade | `app/product/[id].tsx` | App (limitado por estoque exibido) | ✅ servidor revalida |
| Sacola | Zustand local + `POST /v1/cart/quote` | **Servidor** (preço, estoque, totais) | ✅ |
| Endereço | `POST /v1/addresses` | Servidor (posse) | ✅ |
| Frete | `SHIPPING_CENTS = 0` em `orders/pricing.ts` | Servidor | ℹ️ não há regra de frete (não inventar) |
| Descontos | — | — | ℹ️ não existem |
| Pagamento | Tela `checkout/payment` só escolhe o método | — | ❌ **nenhuma cobrança** |
| Criação do pedido | `POST /v1/orders` (transação, `FOR UPDATE`, idempotência + fingerprint) | Servidor | ✅ |
| Estoque | Baixado **na criação** do pedido, sem prazo | Servidor | ⚠️ S-02: pedidos nunca pagos prendem estoque |
| Confirmação | `checkout/success`: "Pedido confirmado… em preparação" | **App** | ❌ S-01 → texto corrigido nesta rodada |
| Status | Sempre `placed` | — | ❌ nada transiciona |
| Cancelamento/reembolso | — | — | ❌ inexistente |

Testes que já cobrem o fluxo atual (`server/test/orders.test.ts`, `security.test.ts`): preço manipulado pelo cliente (400), estoque insuficiente (409), corrida pela última unidade (1×201, 5×409), repetição com mesma chave (200, mesmo pedido), mesma chave com outro conteúdo (409), pedido de outra conta (404), endereço de outra conta (404).

## 2. Bloqueio

**Não há conta/chaves Stripe no ambiente** (`grep` sem resultados; `.env.example` sem variáveis). Implementar sem chaves de teste impediria validar o fluxo de ponta a ponta (DoD §11). Necessário (B-05): `STRIPE_SECRET_KEY=sk_test_…`, `STRIPE_PUBLISHABLE_KEY=pk_test_…`, `STRIPE_WEBHOOK_SECRET=whsec_…` (do `stripe listen` local) e a confirmação de quais métodos a conta tem habilitados (cartão; Pix e boleto dependem de conta Stripe Brasil).

## 3. Fluxo proposto

```
App                                   API                                         Stripe (test)
 │ POST /v1/orders (Idempotency-Key)   │ transação: trava, recalcula, reserva estoque │
 │ ──────────────────────────────────▶ │ order.status = pending_payment               │
 │                                     │ reserved_until = now()+30 min                │
 │                                     │ PaymentIntent.create(amount=total do banco,  │
 │                                     │   currency=brl, metadata.order_id,           │
 │                                     │   idempotencyKey = "order:<id>") ──────────▶ │
 │ ◀── { order, payment: { clientSecret, customerEphemeralKey?, publishableKey } }    │
 │ PaymentSheet (UI do Stripe; cartão nunca passa pela API)  ─────────────────────────▶│
 │ resultado do SDK = só "dica" de UX ──▶ tela "Processando pagamento" + polling       │
 │                                     │ ◀── webhook payment_intent.succeeded (assinado)
 │                                     │ verifica assinatura (raw body), dedupe por event.id,
 │                                     │ confere amount/currency/order_id, transição monotônica
 │ GET /v1/orders/:id  ──────────────▶ │ status = paid  → app mostra "Pagamento aprovado"
```

### Máquina de estados

Pedido (`orders.status`):

```
pending_payment ──(payment_intent.succeeded)──▶ paid ──▶ shipped ──▶ delivered
       │                                          │
       ├──(payment_failed: permanece; usuário pode tentar de novo até expirar)
       ├──(reserva expirou / usuário cancelou / payment_intent.canceled)──▶ cancelled  (+ devolve estoque, cancela PI)
                                                   └──(charge.refunded total)──▶ refunded (+ devolve estoque se não enviado)
```

Regras:
- Transições só **para frente** (tabela de transições permitidas no serviço + `UPDATE … WHERE status = <esperado>`): evento atrasado (`processing` depois de `succeeded`) é ignorado; `succeeded` depois de `cancelled` → registrar alerta e reembolsar automaticamente (pagamento de pedido já cancelado).
- `paid` **só** via webhook verificado (ou reconciliação server-side consultando o PaymentIntent na API do Stripe) — nunca pela resposta do SDK no app.
- Pedidos legados `placed` permanecem como estão (migration não reescreve dados).

### Modelo de dados (migration `0003_payments.sql`, aditiva)
- `orders.status` passa a aceitar `pending_payment`, `refunded`; coluna `reserved_until timestamptz`.
- `payments(id, order_id UNIQUE, provider 'stripe', provider_payment_intent_id UNIQUE, status, amount_cents, currency, last_event_at, created_at, updated_at)`.
- `payment_events(provider_event_id PRIMARY KEY, type, received_at, processed_at)` → deduplicação de webhooks.

### Garantias de "somente teste"
- `env.ts`: `STRIPE_SECRET_KEY` deve casar com `^(sk|rk)_test_`; `STRIPE_PUBLISHABLE_KEY` com `^pk_test_`. Chave `live` → **app não sobe** (teste unitário obrigatório).
- Nenhuma chave no app além da publicável de teste, entregue pela API.

## 4. Backlog do pagamento

| ID | Task | P | Depende |
|---|---|---|---|
| PAY-01 | Texto honesto na confirmação (pedido recebido ≠ pago) | P1 | — (**feito**) |
| PAY-02 | Migration de estados + `payments` + `payment_events` | P1 | B-05 |
| PAY-03 | Criação de PaymentIntent no `POST /orders`, guarda de chave `test` | P1 | PAY-02 |
| PAY-04 | Webhook `/v1/webhooks/stripe` (raw body, assinatura, dedupe, transição monotônica, valor/moeda conferidos) | P1 | PAY-02 |
| PAY-05 | Expiração de reserva: job que cancela `pending_payment` vencidos, devolve estoque e cancela o PI | P1 | PAY-02 |
| PAY-06 | App: `@stripe/stripe-react-native` (incluído no Expo Go) com PaymentSheet; tela de processamento com polling do pedido | P1 | PAY-03 |
| PAY-07 | Cancelamento pelo cliente enquanto `pending_payment`; reembolso de teste para `paid` | P2 | PAY-04 |
| PAY-08 | Limite de pedidos `pending_payment` por usuário (ex.: 3) | P2 | PAY-02 |
| PAY-09 | Reconciliação: endpoint/rotina que consulta o PI quando o webhook não chega | P2 | PAY-04 |

## 5. Testes obrigatórios (Stripe Test Mode)

| Cenário | Como | Esperado |
|---|---|---|
| Aprovado | cartão `4242 4242 4242 4242` | webhook `succeeded` → `paid`; estoque permanece baixado |
| Recusado | `4000 0000 0000 0002` | `payment_failed`; pedido segue `pending_payment`; nova tentativa possível |
| Autenticação 3DS | `4000 0025 0000 3155` | sheet pede autenticação; só `paid` após webhook |
| Pendente | Pix/boleto de teste (se habilitados) ou PI em `processing` | pedido `pending_payment`, app mostra "aguardando" |
| Abandono | fechar o sheet | pedido `pending_payment`; expira em 30 min → `cancelled` + estoque devolvido |
| Timeout na confirmação | derrubar a rede após confirmar | app consulta `GET /orders/:id`; não duplica pedido (mesma `Idempotency-Key`) |
| Webhook duplicado | reenviar o mesmo `event.id` | 200, sem efeito |
| Assinatura inválida | header alterado | 400, nada muda |
| Fora de ordem | `processing` após `succeeded` | ignorado; continua `paid` |
| Repetição da compra | mesma chave | mesmo pedido e mesmo PI |
| Preço alterado pelo cliente | campo `price` | 400 (já coberto) |
| Estoque alterado | estoque zerado entre cotação e pedido | 409 (já coberto) |
| Pedido de outra conta | `GET /orders/:id` alheio | 404 (já coberto) |
| Stripe indisponível | mock do cliente lançando erro | transação revertida, estoque devolvido, 503 |
| Chave live | `STRIPE_SECRET_KEY=sk_live_…` | boot falha |

Ferramentas: Stripe CLI (`stripe listen --forward-to localhost:3333/v1/webhooks/stripe`, `stripe trigger payment_intent.succeeded`) e testes de integração com cliente Stripe injetado + `stripe.webhooks.generateTestHeaderString` para assinar eventos sem rede.
