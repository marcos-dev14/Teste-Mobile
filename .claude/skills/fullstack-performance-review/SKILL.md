---
name: fullstack-performance-review
description: Diagnóstico e otimização de performance da API, do banco e do app React Native com métricas e orçamentos definidos — medir, otimizar o gargalo real, medir de novo. Use ao investigar lentidão, revisar listas/consultas ou validar uma entrega quanto a desempenho.
---

# Revisão de performance

## Orçamentos (ambiente local)
| Métrica | Alvo |
|---|---|
| `GET /v1/products` p95 (20 itens) | < 50 ms |
| `GET /v1/products/:id` p95 | < 30 ms |
| `POST /v1/orders` p95 (3 itens) | < 150 ms |
| Listas no app | ≥ 55 fps no Perf Monitor durante scroll |
| Re-render ao alterar quantidade no carrinho | apenas a linha alterada + resumo |

## Procedimento
1. **Linha de base**: API rodando com `LOG_LEVEL=warn`; `npx autocannon -c 20 -d 10 http://127.0.0.1:3333/v1/products`. Registre p50/p95/req/s.
2. **Banco**: `EXPLAIN (ANALYZE, BUFFERS)` das consultas de listagem/detalhe/pedido; confirme uso de índice e ausência de N+1 (contagem de queries por requisição).
3. **App**: React DevTools Profiler (Expo dev tools) ao alterar quantidade e ao filtrar; Perf Monitor ao rolar a grade.
4. **Otimize** apenas o que excede o orçamento. Opções típicas: índice; consulta única com `ANY`; `staleTime`/`placeholderData` no React Query; `memo` em itens de lista; seletores Zustand granulares; `expo-image` com `cachePolicy="memory-disk"` e `recyclingKey`.
5. **Remeça** e registre antes/depois em `docs/04-seguranca-e-performance.md`.

## Erros comuns
- Otimizar sem medir; `useCallback` em todo lugar.
- `refetchOnWindowFocus` e `staleTime: 0` em catálogo quase estático.
- Imagens 2000 px num card de 180 dp (peça `w=` adequado à URL do CDN).

## Validação
Números registrados com comando e ambiente; nenhuma otimização reduziu segurança ou legibilidade sem justificativa.
