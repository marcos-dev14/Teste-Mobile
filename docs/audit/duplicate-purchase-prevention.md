# Prevenção de compras e cobranças duplicadas

Duas camadas independentes, ambas no backend (o botão desabilitado no app é só complemento):

1. **Pedido** — `Idempotency-Key` (UUID) obrigatório em `POST /v1/orders`; `UNIQUE (user_id, idempotency_key)`; fingerprint do conteúdo (mesma chave com outro conteúdo → 409); transação com trava do usuário e das cores (`FOR UPDATE`, em ordem de id); **rechecagem da chave após a trava** (correção B1); decremento condicional de estoque e `CHECK (stock >= 0)`.
2. **Cobrança** — **um único PaymentIntent por pedido**: `payments.order_id UNIQUE` + chave de idempotência no Stripe `order:<id>:payment-intent`; o pagamento só é gravado sob a trava do pedido ainda pendente (correção B2). Como o Stripe aceita no máximo um pagamento bem-sucedido por PaymentIntent, **um pedido não pode ser cobrado duas vezes**. Reembolso com chave `order:<id>:refund` (nunca em dobro).

No app, a chave fica **persistida** enquanto a mesma compra não termina (correção A2): retentativa após timeout, perda de resposta ou reabertura do app reaproveita a chave; nova compra (após concluir) gera chave nova — compras legítimas idênticas continuam permitidas.

## Cenários

Legenda: **E** = comprovado por execução (teste automatizado contra Postgres real ou HTTP real); **C** = verificado no código.

| # | Cenário | Resultado | Evidência |
|---|---|---|---|
| 1 | Toque duplo em "Finalizar" | 1 pedido; botão bloqueado durante o envio; mesma chave | E: adversarial S1 (20 envios simultâneos → 1×201 + 19×200, estoque −1) |
| 2 | Duas requisições simultâneas, mesma intenção | 1 pedido, as demais recebem o mesmo pedido (200) | E: S1; `orders.test.ts` "retentativas simultâneas…" |
| 3 | Pedido criado, resposta não chega | Retentativa devolve o mesmo pedido | E: adversarial S2 (cliente aborta em 5 ms → retentativa 200, 1 pedido) |
| 4 | Usuário tenta de novo achando que falhou | Idem 3 | E: S2 |
| 5 | App fechado durante o checkout e reaberto | Chave persistida → mesmo pedido | E: `checkout-intent.test.ts` (reinício simulado) + S2 no servidor. **Antes da correção A2: duplicava** |
| 6 | Repetição após timeout | Idem 3 | E: S2 |
| 7 | Duas instâncias do app finalizando a mesma compra | Cada instância gera sua chave → **2 pedidos** (indistinguível de recompra legítima). Limitado a 3 pendentes; cada pedido tem 1 PaymentIntent: **não há cobrança dupla** sem o cliente pagar os dois conscientemente; o não pago expira e devolve o estoque | C + E: S4 (recompra), S7. Documentado como risco residual RR-04 |
| 8 | Requisições concorrentes para o mesmo carrinho | Igual a 1–2 (mesma chave) ou 7 (chaves diferentes) | E: S1, S5 |
| 9 | Criação/confirmação repetida no Stripe | 1 PaymentIntent; confirmação concorrente de Pix devolve as instruções vigentes | E: S7 (10 inícios simultâneos → 1 PI, 1 linha); S8 + 30 gerações simultâneas de Pix → todas 200, 1 QR; teste "outra requisição confirma o Pix no mesmo instante" |
| 10 | Webhook entregue várias vezes | Processado uma vez (PK em `payment_events`, mesma transação do efeito) | E: "webhook duplicado é processado uma única vez"; e2e real |
| 11 | Pagamento confirmado, atualização do pedido falha | Transação do webhook reverte → 500 → Stripe reenvia; reconciliação (`/payment/sync`, rotina) relê o PI | E: testes de reconciliação; C: `service.ts` |
| 12 | Pedido criado, chamada ao Stripe falha | Pedido segue pendente; nova tentativa funciona | E: "Stripe indisponível → 503…" |
| 13 | Atualizar a tela / voltar à etapa anterior | Mesma chave; sair durante a finalização não perde a navegação | E: `audit-regressions.test.tsx` (tela desmontada no meio). **Antes da correção B6: navegação perdida** |
| 14 | Dois dispositivos comprando a última unidade | Exatamente 1 pedido, estoque 0, demais 409 | E: S5 (8 compradores) e `orders.test.ts` |
| 15 | Estoque alterado entre pedido e pagamento | O estoque é **reservado na criação** do pedido; a confirmação não depende do estoque atual; cancelamento/expiração devolvem (uma única vez, sob trava e com guarda de status) | E: testes de expiração/cancelamento; C: 3 chamadas a `restockOrder`, todas sob `lockOrder` com status de origem distinto |

## Corrigido nesta auditoria

- **A2** retentativa após reabrir o app duplicava o pedido.
- **B1** duplicata simultânea podia receber 409 enganoso (e o app mostrava "estoque mudou" com o pedido já criado).
- **B2** corrida entre cancelamento/expiração e o 1º início de pagamento.
- **B6** sair da revisão durante a finalização deixava o pedido criado "invisível".
- **C1** confirmação concorrente de Pix/boleto podia virar 500.
