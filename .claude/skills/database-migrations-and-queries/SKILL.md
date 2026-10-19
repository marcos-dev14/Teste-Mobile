---
name: database-migrations-and-queries
description: Procedimentos de persistência com PostgreSQL e node-postgres neste projeto — migrations SQL versionadas com checksum, seed idempotente, transações, locks, índices e otimização de consultas. Use ao alterar o schema, escrever SQL ou investigar desempenho do banco.
---

# Migrations, transações e consultas

## Ambiente
- Banco local: `docker compose up -d` em `server/` → container `mp-ecommerce-postgres`, `127.0.0.1:5442`. Banco de teste: `ecommerce_test` (criado pelo script de init do container).
- Comandos (`server/`): `npm run db:migrate` · `npm run db:seed` · `npm run db:status`.

## Migrations
1. Crie `server/db/migrations/NNNN_descricao.sql` (próximo número, 4 dígitos). Uma intenção por arquivo.
2. Inclua constraints (`NOT NULL`, `CHECK`, `UNIQUE`, FK com `ON DELETE` explícito) e índices de FKs na mesma migration.
3. Mudanças em tabela com dados: aditivas primeiro (nova coluna nullable → backfill → `SET NOT NULL` em migration posterior).
4. Nunca edite migration aplicada — o runner compara SHA-256 e aborta. Corrija com nova migration.
5. Rode `npm run db:migrate` duas vezes (segunda deve ser no-op) e os testes.

## Consultas
- Sempre parametrizadas (`$1`). Identificadores dinâmicos (ex.: coluna de ordenação) só a partir de **whitelist** no código.
- Paginação com `ORDER BY <chave>, id` (desempate estável) + `LIMIT/OFFSET` limitado (`pageSize ≤ 50`).
- Coleções filhas: uma consulta com `= ANY($1::uuid[])` e agrupamento em memória, ou `json_agg` — nunca loop de consultas.
- Busca textual: `name ILIKE '%' || $1 || '%'` com índice GIN `pg_trgm`; escape `%`/`_` da entrada.

## Transações e concorrência
- `withTransaction(pool, async (tx) => {...})`. Toda leitura que decide uma escrita (estoque, posse) ocorre dentro da transação.
- Travar linhas com `SELECT … FOR UPDATE` ordenando por `id` para evitar deadlock.
- Decremento condicional como defesa adicional: `UPDATE … SET stock = stock - $2 WHERE id = $1 AND stock >= $2`.
- Idempotência com `UNIQUE (user_id, idempotency_key)`; trate `23505` retornando o recurso existente.

## Erros comuns
- `JSON.stringify` em coluna JSONB (grava string) — passe o objeto.
- Esquecer `client.release()` (use o helper).
- `float` para dinheiro.

## Validação
Migrations do zero em banco vazio; `EXPLAIN (ANALYZE, BUFFERS)` das listagens e do pedido; teste de concorrência (`server/test/orders.concurrency.test.ts`) verde.
