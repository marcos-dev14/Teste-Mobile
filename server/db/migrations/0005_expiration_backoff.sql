-- 0005 — Rotina de expiração sem "inanição" (achado B3 da auditoria final).
-- Pedidos com reserva vencida que ainda não podem ser encerrados (boleto em aberto, pagamento
-- em processamento) eram selecionados de novo a cada execução e podiam ocupar todo o lote.
-- Aditiva: coluna nulável, nenhum dado reescrito.

ALTER TABLE orders ADD COLUMN next_expiration_check_at timestamptz;

-- Índice parcial usado pela rotina (substitui o da 0003 na consulta, que continua válido).
CREATE INDEX orders_expiration_queue_idx ON orders (reserved_until, next_expiration_check_at)
  WHERE status = 'pending_payment';
