# Integridade do banco de dados e dos pedidos

## Schema (migrations 0001–0005)

| Regra | Mecanismo | Situação |
|---|---|---|
| Pedido pertence a um usuário | `orders.user_id NOT NULL REFERENCES users ON DELETE RESTRICT`; todo SQL filtra por `user_id` | ✅ |
| Itens coerentes | `CHECK quantity BETWEEN 1 AND 20`, `CHECK line_total_cents = unit_price_cents * quantity`, `UNIQUE (order_id, color_id)` | ✅ |
| Total coerente | `CHECK total_cents = subtotal_cents + shipping_cents`; subtotal calculado no servidor | ✅ |
| Snapshot da compra | nome, cor, imagem e preço unitário em `order_items`; endereço em `orders.shipping_address` (JSONB imutável) | ✅ |
| Frete / descontos | Frete fixo 0 calculado no servidor; **não há descontos** no sistema | ✅ (nada a validar) |
| Estoque nunca negativo | `CHECK stock >= 0`, decremento condicional sob `FOR UPDATE` | ✅ |
| Estoque reservado/devolvido uma vez | 3 chamadas a `restockOrder`, todas sob `lockOrder` com guarda de status de origem distinto | ✅ (revisão de código) |
| Pedido duplicado por intenção | `UNIQUE (user_id, idempotency_key)` + fingerprint | ✅ |
| Cobranças múltiplas por pedido | `payments.order_id UNIQUE` (um PaymentIntent por pedido; o Stripe aceita no máximo um sucesso por PI). Várias **tentativas** no mesmo PI são permitidas (cartão recusado, novo Pix) — regra de negócio correta | ✅ |
| Histórico financeiro protegido | `ON DELETE RESTRICT` em `orders.user_id`, `payments.order_id`, `order_items.product_id/color_id`; endereço `SET NULL` com cópia no pedido | ✅ |
| Transições de estado | Feitas no serviço, sob trava, com guarda de status; estados finais de pagamento definitivos | ✅ |
| Valores de status | `CHECK` em `orders.status`, `payments.status`, `payments.method`, `currency = 'brl'` | ✅ |

## Migrations

- `0003`/`0004` trocam o `CHECK` de status **ampliando** o conjunto permitido: seguras. `0005` adiciona coluna nulável e índice: segura.
- Todas rodam em transação própria, com `pg_advisory_lock` e checksum.
- **Ordem de deploy (risco P3, documentado):** a `0003` mudou o `DEFAULT` de `orders.status` para `pending_payment`. Se ela rodar enquanto a versão **anterior** do código ainda atende, pedidos novos ficariam `pending_payment` sem prazo — o monitor `pending_without_reservation` acusa. Regra: **publicar o código antes da migration** (o código atual sempre informa status e prazo explicitamente).
- Aplicadas no banco de desenvolvimento: 0001–0005 (todas aditivas; nenhum dado reescrito).

## Verificação dos dados (banco de desenvolvimento, 2026-10-21, somente leitura)

| Verificação | Resultado |
|---|---|
| Pedido pago sem pagamento confirmado | 0 |
| Pagamento confirmado com pedido não pago/reembolsado | 0 |
| Subtotal ≠ soma dos itens; quantidade ≠ soma | 0 / 0 |
| Pedido sem itens | 0 |
| Pendente sem prazo | 0 |
| Encerrado com prazo preenchido | 0 |
| Pagamento cancelado com pedido aberto | 0 |
| Estoque negativo | 0 |
| **Pendente com reserva vencida** | **1** — causa: rotina só rodava dentro da API, que estava parada (achado B3). Resolvido por `pnpm jobs:run`; nova verificação: 0 |
| Pagos (10) × pagamentos confirmados (10) | consistentes |

Nenhum dado foi alterado manualmente. As verificações agora existem como comando: `pnpm db:integrity`.
