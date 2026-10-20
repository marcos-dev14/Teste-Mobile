# 04 — Segurança e performance

Data: 2026-10-19. Revisões feitas por agentes independentes (`security-engineer` e `fullstack-reviewer`), que só leram o código e executaram testes, sem editar arquivos. Todas as evidências vêm de testes automatizados ou de requisições reais contra a API local.

## 1. Modelo de ameaças (resumo)
| Ativo | Ameaça | Controle implementado | Evidência |
|---|---|---|---|
| Conta | Força bruta, enumeração | Rate limit de 10/min por IP em login e cadastro; scrypt; hash fictício para e-mail inexistente; mensagem genérica | `test/security.test.ts` (429); tempo de login uniforme medido pelo revisor (69–108 ms × 70–86 ms) |
| Sessão | Roubo de token | Access JWT HS256 de 15 min com `iss`/`aud`/`typ`; refresh opaco com hash, rotação, detecção de reuso e janela de tolerância de 30 s; SecureStore no app | `test/auth.test.ts`, `test/security.test.ts` (alg none, sub trocado, secret errado, aud errado, tipo errado, expirado) |
| Pedidos e endereços | IDOR | `user_id` do token em todo SQL; recurso alheio → 404 | `test/orders.test.ts`, `test/addresses.test.ts`; revisor: GET/DELETE cruzados → 404 |
| Preço e estoque | Manipulação | Schemas `strict`; preço e estoque lidos do banco com `FOR UPDATE`; decremento condicional | Campos `price`, `totalPrice`, `userId` → 400; corrida pela última unidade: 1 × 201 e 5 × 409 |
| Disponibilidade | Abuso | Rate limit global de 300/min; `bodyLimit` de 64 KB; `pageSize ≤ 50`; até 20 linhas e 20 unidades por linha | 70 KB → 413; `pageSize=500` → 400 |
| Dados pessoais | Vazamento | Schemas de resposta; `redact` no pino; 500 genérico; limpeza de cache, checkout e sacola ao sair | `error-handler.test.ts`; `session-safety.test.tsx` |

## 2. Situação dos problemas da auditoria (S1–S17)
Verificado pelo revisor de segurança com evidência: **S1–S14 e S16 resolvidos**; S15 resolvido no server e parcial no mobile (ver §4); S17 resolvido (as credenciais padrão do compose são apenas para uso local).

## 3. Achados das revisões independentes e tratamento
| Origem | Sev. | Achado | Status |
|---|---|---|---|
| Revisor full stack | **Bloqueante** | `ZodError` da serialização de resposta virava 400 e expunha campos | **Corrigido**: só entrada (`validationContext`) vira 400; o resto vira 500 logado (`error-handler.test.ts`) |
| Revisor full stack | Importante | Documentação divergente (ordenação, tamanho máximo da senha) | **Corrigido** |
| Revisor full stack | Importante | Endereço removido em outro aparelho causava ciclo de erro no checkout | **Corrigido**: limpa a seleção e invalida a lista |
| Revisor full stack | Importante | Limite de linhas diferente entre cotação (50) e pedido (20) | **Corrigido**: `MAX_LINES_PER_ORDER` compartilhado + limite na sacola |
| Revisor full stack | Importante | Faltavam testes para idempotência no app, limpeza de sessão e `safeRedirect` | **Corrigido**: `session-safety.test.tsx` |
| Revisor full stack | Sugestão | Corrida entre logout e refresh | **Corrigido**: contador de geração (teste dedicado) |
| Revisor full stack | Sugestão | Tela de confirmação sem pilha (deep link) prendia o usuário | **Corrigido**: `canDismiss` + `navigate('/')` |
| Revisor full stack | Sugestão | Estado derivado via `useEffect`; regra de endereços na rota | **Corrigido**: seleção derivada no render; `addresses/service.ts` |
| Segurança F1 | Média | Esvaziamento de estoque com pedidos não pagos | **Aceito com mitigação parcial** (limites por pedido e rate limit). Solução completa (reserva com prazo até o pagamento) depende da integração de pagamento → `docs/06` |
| Segurança F2 | Média | Refresh duplicado derrubava a sessão legítima | **Corrigido**: janela de tolerância de 30 s, com o sucessor travado e reconferido (`FOR UPDATE`); depois dela, reuso revoga a família (teste). **Trade-off aceito:** um token roubado reapresentado em até 30 s após a rotação legítima não dispara a revogação; a família continua revogável e o access token dura 15 min |
| Revisor full stack (2ª rodada) | Importante | Sessão expirada apagava a sacola | **Corrigido**: a sacola só é limpa em logout explícito (`endedBy: 'user'`), com teste dos dois casos |
| Segurança F3 | Baixa | Cadastro revela e-mail existente (409) | **Aceito** (trade-off de UX, mitigado por rate limit); alternativa com confirmação por e-mail → `docs/06` |
| Segurança F4 | Baixa | Access token vale até 15 min após o logout | **Aceito** (desenho stateless, TTL curto) |
| Segurança F5 | Baixa | Sacola de um usuário visível para o próximo no mesmo aparelho | **Corrigido**: sacola limpa na transição logado → deslogado |
| Segurança F6 | Baixa | Dependências do mobile | Ver §4 |
| Segurança T1 | Média (produção) | App aceitava HTTP | **Corrigido**: build de release exige `https://` |
| Segurança T2 | Baixa | Rate limit só por IP | **Aceito**; limite por conta e store compartilhado → `docs/06` |
| Segurança T3 | Baixa | `safeRedirect` aceitava formas exóticas (`/\evil.com`) | **Corrigido**: allowlist por regex (teste) |
| Segurança T4 | Baixa | Segredo de exemplo passava na validação | **Corrigido**: recusado com `NODE_ENV=production` (`env.test.ts`) |

## 4. Dependências (`pnpm audit --prod`)
> Números abaixo medidos com `npm audit` antes da migração para pnpm; repita com `pnpm audit --prod` em `server/` e `mobile/`.

- **server: 0 vulnerabilidades.** A troca de `bcrypt` por `scrypt` nativo eliminou `node-pre-gyp`/`tar`; NestJS e Prisma foram removidos.
- **mobile: 61 alertas após o upgrade para o SDK 57 (eram 74 no SDK 52), quase todos no toolchain** (Metro, `@expo/cli`, jest, config plugins). Eles rodam só no desenvolvimento e no build e não vão para o bundle. Alcançáveis em runtime, segundo o revisor: `query-string`/`decode-uri-component` (DoS por deep link malformado, baixa severidade), `nanoid` (não alcançável) e `@babel/runtime` (ReDoS restrito).
- **Tentativa de correção (ainda com npm):** `npm audit fix` sem `--force` alterou o hoisting e quebrou a resolução do `expo-router` (`Cannot find module 'query-string'`). Foi revertido para manter o app funcional. **Justificativa formal:** o upgrade para o SDK 57 reduziu os alertas, mas os restantes dependem de correções upstream do Expo/React Native (o `npm audit fix --force` proposto rebaixaria pacotes para versões incompatíveis com o SDK).

## 5. Performance

### Orçamentos e medições
Ambiente: instância compilada (`node dist/server.js`) com `LOG_LEVEL=warn` e sem rate limit, banco isolado `ecommerce_bench` (criado e removido para a medição), autocannon com 10 conexões por 10 s, Windows 11 + Docker Desktop.

| Endpoint | req/s | p50 (ms) | p97.5 (ms) | p99 (ms) | Orçamento | Status |
|---|---|---|---|---|---|---|
| `GET /v1/products` (20 itens) | 1498 | 6 | 11 | 14 | p95 < 50 | ✅ |
| `GET /v1/products?search=cal&sort=price_asc` | 1679 | 5 | 10 | 12 | p95 < 50 | ✅ |
| `GET /v1/products/:id` | 2607 | 3 | 6 | 7 | p95 < 30 | ✅ |
| `POST /v1/cart/quote` | 2527 | 3 | 6 | 8 | — | ✅ |
| `POST /v1/orders` (10 conexões disputando **a mesma** linha de estoque) | 150 | 19 | 129 | 337 | p95 < 150 | ✅ (p97.5) |
| `GET /v1/orders` (usuário com 1.508 pedidos) | 915 | 10 | 16 | 18 | — | ✅ |

**Consistência sob carga:** 1.508 pedidos concorrentes baixaram exatamente 1.508 unidades do estoque, sem perda nem duplicação. O p99 dos pedidos reflete a serialização intencional por `FOR UPDATE` na mesma linha, que é o pior caso.

### Planos de consulta (`EXPLAIN ANALYZE`, 1.508 pedidos)
- Pedidos do usuário: `Index Only Scan using orders_user_created_idx`, 0,125 ms.
- Itens de prévia (`= ANY`): `Bitmap Index Scan on order_items_order_id_color_id_key`, 0,35 ms. São 3 consultas fixas por página, sem N+1.
- Listagem de produtos: *Seq Scan* em 7 linhas (escolha correta do planner para tabela minúscula); o índice GIN `f_unaccent(name) gin_trgm_ops` está pronto para catálogos maiores.

### Mobile
- Listas com `FlatList` memoizado (`ProductCard`, `CartLine`, `OrderCard` com `memo`), `keyExtractor` estável, `removeClippedSubviews` e `windowSize` reduzido.
- `expo-image` com `cachePolicy="memory-disk"` e `recyclingKey`.
- Seletores granulares do Zustand: o contador da aba Sacola só re-renderiza quando a contagem muda.
- React Query com `staleTime` por tipo de dado: catálogo 5 min, detalhe 30 s, cotação 15 s. `keepPreviousData` evita o "pisca" ao alterar quantidade. A rede é pausada offline (NetInfo) e os dados são revalidados ao voltar para o app.
- Animações só em `transform`/`opacity` na UI thread; entrada escalonada limitada aos 6 primeiros cards; `useReducedMotion` respeitado.
- **Limitação:** a medição de FPS com o Perf Monitor não foi registrada numericamente; a fluidez foi verificada visualmente no emulador. O Profiler fica como pendência em `docs/06`.
