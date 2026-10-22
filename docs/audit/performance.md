# Performance e observabilidade

## 1. Linha de base disponível

**Não foram feitas novas medições de carga nesta rodada.** As únicas medições existentes são as de `docs/04-seguranca-e-performance.md §5` (2026-10-19, autocannon 10 conexões × 10 s, build compilado, Windows 11 + Docker Desktop):

| Endpoint | req/s | p50 | p97.5 | p99 |
|---|---|---|---|---|
| `GET /v1/products` | 1498 | 6 ms | 11 ms | 14 ms |
| `GET /v1/products/:id` | 2607 | 3 ms | 6 ms | 7 ms |
| `POST /v1/cart/quote` | 2527 | 3 ms | 6 ms | 8 ms |
| `POST /v1/orders` (disputa da mesma linha) | 150 | 19 ms | 129 ms | 337 ms |
| `GET /v1/orders` (1.508 pedidos) | 915 | 10 ms | 16 ms | 18 ms |

O autocannon reporta p97.5, não p95. Essas medições são de um único aparelho em ambiente local; não representam produção.

## 2. Diagnóstico (inspeção de código)

| ID | Área | Achado | Evidência | Impacto | Task |
|---|---|---|---|---|---|
| F-01 | API | Listagens fazem 2 consultas (página + `count(*)`) em paralelo; sem N+1 (itens de pedidos em 1 consulta `= ANY`) | `products/repository.ts`, `orders/repository.ts` | Baixo | — |
| F-02 | API | Paginação por `OFFSET` (máx. página 1000) | `lib/schemas.ts` | Baixo hoje; cresce com o catálogo | PERF-02 |
| F-03 | API | `/health/ready` sem cache | `health/routes.ts` | Baixo | SEC-03 |
| F-04 | App | Imagens Unsplash com `w=900` para card e detalhe | `db/seed-data.ts` | Banda/memória em listas | PERF-03 |
| F-05 | App | Listas memoizadas, `expo-image` com cache em disco, seletores granulares do Zustand | inspeção | ✅ | — |
| F-06 | App | Cotação da sacola com `keepPreviousData` e `staleTime` 15 s; query key inclui itens → cada alteração de quantidade gera 1 requisição | `cart/hooks.ts` | Aceitável (1 req por ação) | — |
| F-07 | App | Consulta de CEP (nova) | — | Precisa ser deduplicada e cacheada | ADDR-01/03 (cache no servidor 24 h + React Query) |
| F-08 | Obs. | Latência por requisição já é registrada pelo pino (`responseTime` em "request completed"), mas não há agregação (p50/p95/p99) nem métricas de erro por rota | logs | Sem visão de regressão | OBS-02 |
| F-09 | Obs. | Sem monitoramento de crash no app | — | Falhas em produção invisíveis | OBS-01 |
| F-10 | Teste | Jest avisa "worker process has failed to exit gracefully" (timer/handle aberto) | saída do `pnpm test` | Ruído / lentidão | QA-05 |

## 3. Plano

1. **Rebaseline** (PERF-01): script versionado `server/scripts/bench.ts` com autocannon contra banco isolado `ecommerce_bench`, registrando p50/p95/p99 e taxa de erro; executar antes e depois de cada mudança de performance.
2. **Métricas** (OBS-02): plugin leve com histograma de latência por rota (`routeOptions.url`, sem ids) e contadores de status, exposto em `/metrics` protegido (rede interna) ou exportado por OpenTelemetry quando houver infraestrutura. Métricas de negócio: pedidos criados, falhas de cotação, latência e taxa de falha da consulta de CEP por provedor.
3. **Metas** (definir após PERF-01, proposta inicial): `GET /products` p95 < 50 ms, `GET /products/:id` p95 < 30 ms, `POST /orders` p95 < 150 ms sem disputa, consulta de CEP p95 < 800 ms com cache frio e < 20 ms com cache quente.
4. **Mobile** (PERF-04): medir com React Profiler/Perf Monitor numa build de release no aparelho (Expo Go não é representativo): TTI da Home, tempo até a imagem do produto, FPS durante a animação de adicionar à sacola.

## 4. Logs

- Já redigidos: `authorization`, `cookie`, `password`, `refreshToken`, `set-cookie`.
- Nunca registrar: CEP/endereço consultado, corpo de `POST /addresses`, futuros dados de pagamento (o cartão vai dos campos do Stripe.js direto ao Stripe, nunca à API) e payload completo de webhooks.
- Definir retenção (SEC-05) quando o destino dos logs em produção for escolhido.
