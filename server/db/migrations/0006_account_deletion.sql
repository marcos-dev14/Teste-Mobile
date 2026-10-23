-- 0006 — Exclusão de conta (LGPD-02).
-- A linha de `users` é anonimizada, não apagada: `orders.user_id` é ON DELETE RESTRICT e os
-- pedidos precisam ser guardados pelo prazo legal/fiscal. Endereços e sessões são apagados.
-- Aditiva: coluna nulável, nenhum dado reescrito.

ALTER TABLE users ADD COLUMN deleted_at timestamptz;
