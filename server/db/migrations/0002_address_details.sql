-- 0002 — Número e bairro do endereço (preenchimento por CEP).
-- Aditiva: colunas nuláveis para os endereços já cadastrados; a API exige ambas em novos endereços.
-- Decisões: docs/audit/address-and-cart.md.

ALTER TABLE addresses
  ADD COLUMN number       text CHECK (char_length(number) BETWEEN 1 AND 10),
  ADD COLUMN neighborhood text CHECK (char_length(neighborhood) BETWEEN 2 AND 80);
