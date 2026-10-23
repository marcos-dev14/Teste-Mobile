-- 0004 — Pix e boleto (Stripe, somente modo de teste). Decisões: docs/audit/checkout-stripe.md.
-- Aditiva: nenhum dado existente é reescrito.

-- Pedido cuja reserva venceu sem pagamento (distinto do cancelamento pelo cliente).
ALTER TABLE orders DROP CONSTRAINT orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending_payment', 'placed', 'paid', 'shipped', 'delivered', 'cancelled', 'expired', 'refunded'));

-- Método efetivamente usado no PaymentIntent (os pagamentos existentes são de cartão).
ALTER TABLE payments ADD COLUMN method text NOT NULL DEFAULT 'card' CHECK (method IN ('card', 'pix', 'boleto'));
ALTER TABLE payments ALTER COLUMN method DROP DEFAULT;

-- Código da última falha informada pelo Stripe (cartão recusado, Pix ou boleto expirado…). Nunca dados do pagador.
ALTER TABLE payments ADD COLUMN failure_code text CHECK (char_length(failure_code) <= 100);
