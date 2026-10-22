# Checkout e pagamentos — Stripe (somente modo de teste)

Atualizado em 2026-10-21. Cartão, Pix e boleto implementados e validados **contra o Stripe em modo de teste**, incluindo webhooks reais. Nenhuma chave `live` existe no projeto e o código as recusa em três pontos.

## 1. Métodos disponíveis e limitações

Evidência obtida pela API do Stripe com a chave de teste do projeto (2026-10-21):

| Verificação | Resultado |
|---|---|
| País / moeda da conta | `BR` / `brl` |
| Configuração de métodos padrão | cartão, Pix e boleto **disponíveis e ativos** |
| PaymentIntent com cada método (`allowed_payment_method_types`) | aceito para `card`, `pix`, `boleto` |
| Confirmação de Pix no servidor | `requires_action` + `next_action.pix_display_qr_code` |
| Confirmação de boleto no servidor | `requires_action` + `next_action.boleto_display_details` |
| `charges_enabled` | **false** — a conta **não está ativada para cobranças reais** (não afeta o modo de teste) |

Limitações (documentação oficial: docs.stripe.com/payments/pix e /payments/boleto):

| Método | Exige do pagador | Vencimento | Cancelamento | Confirmação |
|---|---|---|---|---|
| Cartão | dados digitados nos campos do Stripe.js (iframes do Stripe numa WebView do painel; não passam pela API nem pelo JS do app) | reserva de 30 min | a qualquer momento antes de pagar | imediata |
| Pix | nome, e-mail, **CPF/CNPJ** | 60 s a 14 dias (usamos o fim da reserva, 30 min) | antes de vencer | segundos após o pagamento |
| Boleto | nome, e-mail, **CPF/CNPJ**, **endereço** | 0 a 60 dias (usamos 3) | **não é possível com o boleto em aberto** | `succeeded` **1 dia útil** após o pagamento; vencido → `payment_failed` 1 dia útil após o vencimento |

**Cartão (2026-10-22):** o PaymentSheet foi substituído por um painel próprio do app (`card-payment-sheet.tsx`). Número, validade e CVC são campos separados, com títulos e tema do app, feitos com Stripe.js Elements (`cardNumber`, `cardExpiry`, `cardCvc`, `locale: pt-BR`) numa WebView (`stripe-card-fields.tsx`): cada campo é um iframe do Stripe, então o cartão não passa pelo JS do app nem pela API (PCI SAQ A). A confirmação usa `confirmCardPayment(..., { handleActions: false })`; se o banco pedir 3DS, o app chama `handleNextAction` do SDK nativo (tela cheia). Recusa não fecha o painel (o cliente troca de cartão no mesmo pedido). A página só carrega `js.stripe.com` e Google Fonts; navegação no quadro principal é bloqueada.

**Pix (2026-10-22):** contagem regressiva até o vencimento (= fim da reserva, 30 min); ao zerar, o QR some e o app consulta a cada 15 s até a rotina do servidor (a cada minuto) expirar o pedido e devolver o estoque.

**Web:** o SDK `@stripe/stripe-react-native` é só nativo. Na web o Metro usa `mobile/src/features/payments/payment-sheet.web.ts`: cartão informa que está disponível apenas no app; Pix e boleto funcionam (gerados pelo servidor).

Pix em produção exige conta Stripe Brasil elegível e ativada; não há como confirmar essa elegibilidade em modo de teste (pendência P-PROD-1).

## 2. Fluxo implementado

```
App                                        API                                            Stripe (test)
 │ GET /v1/payment-methods ─────────────▶ │ métodos habilitados (PAYMENT_METHODS)          │
 │ POST /v1/orders {paymentMethod}        │ transação: trava usuário e cores, recalcula     │
 │   (Idempotency-Key) ─────────────────▶ │ preços/estoque, reserva estoque:                │
 │                                        │  cartão/Pix 30 min · boleto vencimento + 4 dias │
 │ POST /v1/orders/:id/payment            │ PaymentIntent (total do banco, brl, só o        │
 │   cartão: sem corpo                    │  método do pedido, metadata.order_id,           │
 │   Pix/boleto: { taxId } ────────────▶  │  idempotência por pedido) ────────────────────▶ │
 │                                        │ Pix/boleto: confirma no servidor com nome e     │
 │                                        │  e-mail da conta, CPF/CNPJ (não gravado) e,     │
 │                                        │  no boleto, o endereço de entrega do pedido ──▶ │
 │ ◀── cartão: { clientSecret, publishableKey (pk_test_) }                                  │
 │ ◀── Pix: { qrCodeData, qrCodeImageUrl, hostedInstructionsUrl, expiresAt }                │
 │ ◀── boleto: { number, pdfUrl, hostedVoucherUrl, expiresAt }                              │
 │ cartão: Stripe.js    ──────────────────────────────────────────────────────────────────▶ │
 │ POST /v1/orders/:id/payment/sync ────▶ │ lê o PaymentIntent no Stripe e aplica o estado  │
 │   (após o Stripe.js;    Pix a cada 5 s;│                                                 │
 │    processando a cada 3 s)             │ ◀── webhooks assinados (dedupe por event.id)    │
 │                                        │ rotina a cada 60 s: reserva vencida → expired   │
```

O app **nunca** decide que um pedido foi pago: `paid` só vem do PaymentIntent lido pelo servidor (webhook verificado ou reconciliação).

## 3. Estados

**Pedido** (`orders.status`):

| Estado | Significado | Libera o pedido? |
|---|---|---|
| `pending_payment` | aguardando pagamento (inclui Pix/boleto gerado, pagamento em processamento e tentativa recusada) | não |
| `paid` | Stripe confirmou `succeeded` com valor e moeda conferidos | **sim** |
| `cancelled` | cancelado pelo cliente (PaymentIntent cancelado, estoque devolvido) | não |
| `expired` | reserva venceu sem pagamento, ou boleto venceu (estoque devolvido) | não |
| `refunded` | reembolsado (inclusive automático: pagamento que chegou após cancelamento/expiração) | não |
| `placed` | pedidos anteriores à integração | — |

**Pagamento** (exposto em `paymentStatus` e `paymentFailureCode`): o status do PaymentIntent. "Em processamento" = `processing`; "recusado/falhou" = `requires_payment_method` com `paymentFailureCode` (ex.: `card_declined`, `payment_intent_payment_attempt_failed` para Pix expirado).

Regras: estados finais do pagamento (`succeeded`, `canceled`) são definitivos (evento atrasado não regride); valor, moeda e `metadata.order_id` precisam bater; boleto vencido (`payment_failed`) expira o pedido na hora; Pix vencido permite gerar novo QR enquanto a reserva valer.

## 4. Alterações

**Backend** (`server/`): migrations `0003_payments.sql` e `0004_async_payment_methods.sql` (aditivas); `src/modules/payments/{gateway,service,repository,routes}.ts`; `src/modules/orders/*` (métodos por configuração, reserva por método, `expired`, `paymentFailureCode`); `src/lib/tax-id.ts` (CPF/CNPJ com dígitos verificadores); `src/config/env.ts`; `src/app.ts` (redação de `req.body.taxId` nos logs; rotina de expiração).

**App** (`mobile/`): `src/features/payments/*` (painel de cartão com campos do Stripe.js, API, painel de Pix/boleto, ações do pedido pendente); `src/app/checkout/{payment,review,success}.tsx`; `src/app/orders/[id].tsx`; `src/lib/tax-id.ts`; `src/features/checkout/store.ts` (CPF só em memória); dependências `@stripe/stripe-react-native` 0.64 e `expo-clipboard` (ambas no Expo Go); `app.json` (config plugin do Stripe com opções explícitas — sem elas a configuração do Expo não avaliava).

## 5. Variáveis de ambiente (`server/.env`; valores nunca versionados)

| Variável | Obrigatória | Descrição |
|---|---|---|
| `STRIPE_SECRET_KEY` | sim (fora dos testes) | `sk_test_…` / `rk_test_…`. Chave `live` derruba o boot |
| `STRIPE_PUBLISHABLE_KEY` | sim (fora dos testes) | `pk_test_…`; entregue ao app pela API |
| `STRIPE_WEBHOOK_SECRET` | não | `whsec_…`. Sem ela o webhook responde 503 e vale a reconciliação |
| `PAYMENT_METHODS` | não | `credit_card,pix,boleto` (padrão). Habilite só o que a conta oferece |
| `PAYMENT_RESERVATION_MINUTES` | não | reserva de cartão e Pix (padrão 30); o Pix vence junto |
| `BOLETO_EXPIRES_AFTER_DAYS` | não | vencimento do boleto, 0–60 (padrão 3) |
| `BOLETO_CONFIRMATION_GRACE_DAYS` | não | dias extras de reserva após o vencimento (padrão 4) |

## 6. Webhooks de teste

```powershell
cd server
$env:STRIPE_API_KEY = "<sk_test_...>"     # ou: stripe login
npx -y @stripe/cli listen --print-secret   # copie o whsec_ para STRIPE_WEBHOOK_SECRET no .env
npx -y @stripe/cli listen --forward-to localhost:3333/v1/webhooks/stripe `
  --events payment_intent.succeeded,payment_intent.payment_failed,payment_intent.processing,payment_intent.canceled,payment_intent.requires_action,charge.refunded
```

Simulação em modo de teste (Pix e boleto): CPF `000.000.000-00` e o **e-mail da conta** controla o resultado — `…succeed_immediately@…` (pago em segundos), `…expire_immediately@…` (expira em segundos), `…fill_never@…` (nunca paga), qualquer outro (pago em ~3 min). Cartões: `4242 4242 4242 4242` (aprovado), `4000 0000 0000 0002` (recusado), `4000 0025 0000 3155` (3DS).

## 7. Testes e resultados (2026-10-21)

**Automatizados**: servidor 136/136 (`test/payments.test.ts`, `test/payments-async.test.ts`, `test/payment-methods.test.ts`, `src/lib/tax-id.test.ts`, `src/modules/payments/gateway.test.ts`); app 86/86 (`src/features/payments/__tests__/*`, `src/lib/__tests__/tax-id.test.ts`).

**Reais** (API compilada + Stripe modo de teste + `stripe listen`, sem chamar a reconciliação nos cenários de webhook):

| Cenário | Resultado |
|---|---|
| Pix pago (`succeed_immediately`) | ✅ QR + copia-e-cola; `paid` pelo webhook |
| Pix expirado (`expire_immediately`) | ✅ segue `pending_payment` com `payment_intent_payment_attempt_failed`; novo QR gerado; cancelamento → `cancelled` |
| Boleto pago | ✅ número + PDF; `paid` pelo webhook |
| Cancelar boleto em aberto | ✅ 409 `ORDER_NOT_CANCELLABLE` |
| Boleto vencido (`expire_immediately`) | ✅ `expired`, PI `canceled`, estoque devolvido |
| Cartão (chave publicável + client secret, como o PaymentSheet) | ✅ `paid` pelo webhook |
| Webhook com assinatura falsa | ✅ 400 |
| Webhook `payment_intent.canceled` vindo do Dashboard/API | ✅ pedido encerrado sozinho |
| Estoque ao fim | ✅ exato (pagos baixam; cancelados/expirados devolvem) |
| CPF no banco / CPF, e-mail, chaves, `whsec_`, client secret no log | ✅ nenhuma ocorrência |
| Pix com vencimento = reserva (`fill_never`) | ✅ diferença de 0 s |

**Achados do teste real, corrigidos**: (1) recusa de cancelamento sem código de erro (boleto em aberto; Pix mudando de estado) virava 503 — agora é tratada como "não cancelável agora" e o estado real é relido; (2) mensagem de erro do provedor no log podia ecoar CPF/e-mail — agora é mascarada; (3) config plugin do Stripe sem opções quebrava a configuração do Expo.

**Não validado neste ambiente**: painel de cartão, QR Code e boleto **renderizados no aparelho** (cobertos por testes de componente); 3DS; webhooks entregues fora de ordem pelo Stripe real (cobertos por testes com eventos assinados); comportamento sob carga.

## 8. Pendências para uma futura ativação em produção

| ID | Pendência |
|---|---|
| P-PROD-1 | Ativar a conta Stripe (`charges_enabled`), confirmar elegibilidade de Pix e boleto para a empresa e habilitá-los no Dashboard live |
| P-PROD-2 | Decisão explícita do responsável para trocar `sk_test_`/`pk_test_` por `live`: hoje o código **recusa** chaves live (env, adaptador e app) e aceita CPFs de teste fora de produção — remover essas travas é uma mudança consciente e revisada |
| P-PROD-3 | Endpoint de webhook live no Dashboard (HTTPS público) com o `whsec_` live em cofre de segredos |
| P-PROD-4 | Revisar prazos de boleto e reserva com o negócio (estoque fica reservado por até 7 dias) |
| P-PROD-5 | Rotina de expiração como job agendado único (hoje roda no processo da API) |
| P-PROD-6 | LGPD: CPF/CNPJ passa a ser tratado (enviado ao Stripe, EUA) — política de privacidade, base legal e transferência internacional (`privacy-lgpd.md`) |
| P-PROD-7 | Reembolso solicitado pelo cliente e política de cancelamento após pagamento (CDC, direito de arrependimento) |
| P-PROD-8 | Monitorar reembolsos automáticos que falharem (hoje: log de erro para ação manual) |
| P-PROD-9 | Gerar novas chaves de teste: a secreta atual foi compartilhada em conversa |
