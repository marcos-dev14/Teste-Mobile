# Integridade de pagamentos (Stripe, somente modo de teste)

Complementa [checkout-stripe.md](checkout-stripe.md) (fluxo, estados, variáveis, webhooks de teste) com o resultado da auditoria final.

## Verificações

| Item | Situação | Evidência |
|---|---|---|
| Separação teste × produção | ✅ Chaves `live` recusadas no env (Zod), no adaptador e no app; eventos `livemode` ignorados (C3) | `config/env.ts`, `payments/gateway.ts`, `mobile/src/features/payments/payment-sheet.ts`; testes `env.test.ts`, `gateway.test.ts`, "evento livemode…" |
| Chave secreta fora do app | ✅ App recebe só `pk_test_` e `client_secret`; bundle sem segredos | revisão mobile; `routes.ts` (schema de resposta) |
| Valores calculados no backend | ✅ Preço do banco com trava; moeda fixa `brl` (CHECK); cliente não envia preço (400) | `orders/pricing.ts`, migration 0003; adversarial S6 |
| Associação pedido ↔ pagamento ↔ usuário | ✅ `payments.order_id UNIQUE`; `metadata.order_id` conferido em todo evento; pedido do usuário filtrado por `user_id` | `payments/service.ts` (`applyIntent`); adversarial S9 |
| Idempotência criar/confirmar | ✅ Criação com chave por pedido; confirmação concorrente devolve o estado atual (C1) | adversarial S7/S8; 30 gerações simultâneas de Pix |
| Assinatura do webhook | ✅ Corpo bruto, `constructEvent`, 400 se inválida/ausente, 503 sem segredo | testes + e2e real (assinatura forjada → 400) |
| Deduplicação persistente | ✅ `payment_events` (PK) gravado na mesma transação do efeito | teste "webhook duplicado…" |
| Fora de ordem | ✅ Estados finais definitivos; eventos não finais atrasados só mudam o status exibido | teste "evento fora de ordem…" |
| Falhas temporárias / retries | ✅ SDK com 2 retentativas e timeout de 10 s; 503 ao app; reconciliação por `/payment/sync` e pela rotina | testes "Stripe indisponível…" |
| Confirmação falsa do cliente | ✅ `paid` só pelo PaymentIntent lido no Stripe pelo servidor; app não mostra "aprovado" sem `paid` do servidor | testes app "SDK diz concluído…" e servidor "o app não consegue marcar como pago" |
| Pix e boleto | ✅ Instruções geradas no servidor; boleto não cancelável em aberto; boleto vencido → `expired` | `payments-async.test.ts`; e2e real |
| Pendente / recusado / cancelado / expirado | ✅ Estados e códigos de falha expostos; UI distingue cada um | `success.tsx`; testes |
| Reembolsos | ✅ Automático para pagamento que chega após encerramento, **agora com repetição durável** (A1); `charge.refunded` total → `refunded` | teste "reembolso que falha não se perde…" |
| Liberação antes da confirmação | ✅ Nada é liberado em `pending_payment`; só `paid` | estados em `checkout-stripe.md §3` |

## Janelas de falha entre o Stripe e o banco

| Janela | Antes | Agora |
|---|---|---|
| Stripe confirmou, gravação do pedido falhou | Webhook reverte e o Stripe reenvia; reconciliação | Igual (já correto) |
| PaymentIntent criado, processo cai antes de gravar `payments` | Nova tentativa recebe o mesmo PI (idempotência 24 h); PI sem `client_secret` entregue não é pagável | Igual; e a gravação agora ocorre sob trava do pedido pendente |
| Cancelamento/expiração durante o 1º início de pagamento | Podia entregar `client_secret` de pedido fechado | Corrigido (B2) |
| Pagamento chega após encerramento e o reembolso falha | **Cliente ficava cobrado; só log** | Fila durável + `retryRefunds` (A1) |
| API fora do ar | Nada expirava; reembolsos não eram repetidos | `pnpm jobs:run` por agendador externo; `pnpm db:integrity` acusa pendências (B3) |

## Monitoramento

`pnpm db:integrity` (somente leitura; código de saída 1 em anomalia): pedido pago sem pagamento, pagamento confirmado com pedido pendente, reembolso devido, pendente vencido há mais de 1 h, pagamento cancelado com pedido aberto, totais divergentes, pendente sem prazo. Executado no banco de desenvolvimento em 2026-10-21: detectou 1 pendente vencido (API parada) → resolvido por `pnpm jobs:run` → 7/7 zerados.
