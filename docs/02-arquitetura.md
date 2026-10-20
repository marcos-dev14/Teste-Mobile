# 02 — Arquitetura da nova versão e decisões técnicas

Base: auditoria em [01-auditoria.md](01-auditoria.md). Cada decisão referencia os problemas que resolve (ex.: S1, D2).

## 1. Visão geral

```
┌──────────────────────────┐   HTTPS/HTTP (dev)    ┌───────────────────────────────┐     SQL     ┌──────────────┐
│ App Expo (SDK 57)        │ ───────────────────▶ │ API Fastify 5 (Node 24, TS)   │ ──────────▶ │ PostgreSQL 16│
│ Expo Router · RQ · Zustand│  Bearer access JWT   │ módulos: auth, products, cart,│  pg (pool)  │ migrations   │
│ SecureStore (tokens)     │ ◀─────────────────── │ addresses, orders, health     │             │ SQL versionad│
└──────────────────────────┘   JSON + erros padrão └───────────────────────────────┘             └──────────────┘
```

Princípio central: **o cliente não é confiável**. Identidade vem do token; preços, totais, estoque e posse de recursos são decididos no servidor.

## 2. Decisões (ADRs resumidos)

### ADR-01 — Monorepo simples, sem workspaces
`server/` e `mobile/` continuam como projetos pnpm independentes (cada um com seu `pnpm-lock.yaml`). Workspaces trariam hoisting de módulos nativos no Metro/autolinking sem ganho proporcional para 2 pacotes. Os contratos ficam tipados dos dois lados (`server/src/modules/*/schemas.ts` e `mobile/src/lib/api/types.ts`) e são verificados por **testes de contrato** no backend (as respostas são serializadas pelos schemas Zod, que removem campos não declarados).

### ADR-02 — Fastify 5 + Zod 4, sem framework de DI
- NestJS → Fastify (requisito). Sem container de DI: composição explícita em `buildApp()` com funções-fábrica (`createOrdersService({ db, ... })`). Facilita teste e leitura.
- Validação **e** serialização com Zod via `validatorCompiler`/`serializerCompiler` próprios (`src/lib/zod-compiler.ts`). Schemas de resposta impedem vazamento acidental de campos (S3).
- Objetos de entrada são `strict()`: campo desconhecido (ex.: `price` num item de pedido) gera 400 em vez de ser ignorado silenciosamente (S4, S7).

### ADR-03 — Persistência: `pg` (node-postgres) + SQL explícito + migrations SQL versionadas
Alternativas avaliadas:

| Opção | Prós | Contras | Decisão |
|---|---|---|---|
| ORM (Drizzle, TypeORM, MikroORM) | produtividade | troca um ORM por outro; requisito é não introduzir ORM automaticamente | ✗ |
| Query builder (Kysely, Knex) | tipagem/composição | dependência extra; consultas aqui são poucas e estáveis | ✗ (reavaliar se o domínio crescer) |
| **`pg` + repositórios com SQL parametrizado** | explícito, zero mágica, controle total de transações e `FOR UPDATE` | mapeamento manual de linhas | **✓** |

- Banco **mantido em PostgreSQL** (já era o banco do projeto; não havia dados legados — nenhum container/volume do projeto existia na máquina).
- Repositórios recebem um `Queryable` (pool ou client de transação) → a mesma função funciona dentro ou fora de transação.
- Helper `withTransaction(pool, fn)` com `BEGIN/COMMIT/ROLLBACK` e liberação garantida do client.
- Migrations: arquivos `server/db/migrations/NNNN_nome.sql`, executados em ordem por `src/db/migrate.ts` (~100 linhas): tabela `schema_migrations` com **checksum SHA-256** (migration aplicada e depois editada → erro), `pg_advisory_lock` contra execução concorrente, cada migration em sua própria transação.
- Seed idempotente (`ON CONFLICT (slug) DO UPDATE`), separado de migrations, recusado em `NODE_ENV=production`.

### ADR-04 — Modelo de dados
- Dinheiro em **centavos inteiros** (`integer`, `CHECK >= 0`) (D1).
- `product_colors` ganha **estoque** (`stock integer CHECK >= 0`) — a cor era a unidade de compra no app original (o carrinho já era indexado por `color.id`).
- Pedido relacional: `orders` + `order_items` com **snapshot** de nome, cor, imagem e preço unitário no momento da compra (D2, D3). Endereço de entrega copiado em `orders.shipping_address` (JSONB imutável) + `address_id` com `ON DELETE SET NULL`.
- `email` em `citext` único (case-insensitive no banco, não só no app).
- Índices em todas as FKs; `pg_trgm` + índice GIN para busca por nome; índices compostos para ordenações paginadas.
- `CHECK` para rating 0–5, hex `#RRGGBB`, quantidade 1–20, CEP, status e método de pagamento.
- Gatilho `set_updated_at()` para `updated_at`.

### ADR-05 — Autenticação
- **Access token** JWT HS256 (`@fastify/jwt`), 15 min, `sub = userId`.
- **Refresh token** opaco (32 bytes aleatórios), armazenado apenas como **hash SHA-256**, 30 dias, **rotação a cada uso** e **detecção de reuso** (reuso de token já rotacionado revoga toda a família → mitiga roubo de token).
- Senhas com **scrypt nativo do Node** (`N=2^15, r=8, p=1`, salt de 16 bytes, comparação em tempo constante). Sem dependência nativa (o `bcrypt` antigo trazia `node-pre-gyp`/`tar` vulneráveis — S15). Login com usuário inexistente também executa scrypt contra hash fictício (mitiga enumeração por tempo).
- Política de senha: 8–128 caracteres, ao menos 1 letra e 1 número, validada **no backend** (S11).
- No app: tokens no **expo-secure-store** (Keystore/Keychain) (S13); perfil buscado de `/me`; interceptor faz refresh único concorrente (single-flight) e encerra a sessão se o refresh falhar.

### ADR-06 — Autorização e integridade comercial
- Todas as rotas de endereço, pedido e perfil exigem `Bearer`. O `userId` **nunca** é aceito do cliente; vem de `request.user.sub` (S1, S2).
- Consultas por id sempre filtram `AND user_id = $owner`; recurso de outro usuário → **404** (não 403) para não revelar existência (S2, S6).
- Criação de pedido (`POST /orders`) numa transação:
  1. valida o endereço do próprio usuário;
  2. agrega itens repetidos e trava as cores com `SELECT … FOR UPDATE` **em ordem de id** (evita deadlock);
  3. rejeita produto inativo, cor inexistente/de outro produto e estoque insuficiente (409 com detalhes por item);
  4. calcula subtotal/total no servidor; decrementa estoque; grava pedido e itens.
- **Idempotência**: header `Idempotency-Key` (UUID) obrigatório; `UNIQUE (user_id, idempotency_key)` → retentativa por falha de rede devolve o mesmo pedido em vez de duplicar.
- `POST /cart/quote` (público): o app envia `{productId, colorId, quantity}` e recebe preços atuais, disponibilidade e totais calculados pelo servidor — a UI exibe os valores do servidor no carrinho e na revisão.
- Rotas administrativas públicas do original (`POST /products`, `PATCH /products/:id/rating`) foram **removidas** (S5): não há papel de administrador no escopo; catálogo vem do seed.

### ADR-07 — Pagamento
O original coletava número de cartão e CVV e os descartava (S12). A nova versão **não coleta dados de cartão**: o usuário escolhe o método (`pix`, `credit_card`, `boleto`), registrado no pedido, com aviso explícito de que o pagamento é simulado. Integrar um PSP com tokenização é pendência documentada.

### ADR-08 — Erros, logs e configuração
- Formato único de erro: `{ "error": { "code": "VALIDATION_ERROR", "message": "…", "details"?: [...], "requestId": "…" } }`.
- Erros inesperados → 500 com mensagem genérica; detalhe só no log (S10).
- Logs estruturados com **pino** (nativo do Fastify), `requestId` por requisição, `redact` de `authorization`, `password`, `refreshToken`, `cookie`.
- `@fastify/helmet`, `@fastify/cors` (lista explícita de origens via env; apps nativos não usam CORS), `@fastify/rate-limit` (global 300/min/IP; login/cadastro 10/min/IP; refresh 30/min), `bodyLimit` de 64 KB.
- Configuração validada com Zod no boot (`src/config/env.ts`): app não sobe com `JWT_SECRET` curto ou `DATABASE_URL` ausente.

### ADR-09 — Mobile: arquitetura
- **Expo SDK 57** (RN 0.86, React 19, New Architecture obrigatória), atualizado a partir do SDK 52 para rodar no Expo Go atual (o do iOS só aceita a versão mais recente). Versões sempre as de `pnpm expo install --check`; `pnpm dlx expo-doctor` sem falhas.
- **Remover**: NativeWind/Tailwind (camada de interop em runtime; substituída por design system tipado com `StyleSheet`), Skia, expo-camera, drawer, react-content-loader, masked-view, AsyncStorage para sessão.
- **Adicionar** (todas presentes no Expo Go): `expo-secure-store`, `expo-image` (cache em disco, placeholder, transição), `expo-haptics`, `zustand` (carrinho com seletores e persistência), fontes Google (`Fraunces` display + `Inter` texto).
- Estrutura por feature:
  ```
  src/app/            rotas finas (Expo Router)
  src/features/<x>/   api.ts · hooks.ts · components/ · store.ts
  src/ui/             design system (tokens, tema claro/escuro, componentes)
  src/lib/            http client, env, formatação, query client, motion
  ```
- Dados de servidor: **React Query** (chaves incluem o usuário quando aplicável; invalidação explícita após mutações). Estado local: **Zustand** (carrinho). Sessão: store dedicada + SecureStore.
- Navegação: Stack raiz → grupo `(tabs)` (Início, Buscar, Carrinho, Perfil) + telas empilhadas (produto, checkout, pedidos, endereços) + grupo `(auth)` em modal. **Catálogo e carrinho são públicos**; checkout/pedidos exigem login e retornam ao fluxo após autenticar.
- URL da API: `EXPO_PUBLIC_API_URL` ou, se ausente, derivada do host do Metro (`Constants.expoConfig.hostUri`) com fallback `10.0.2.2` no emulador Android (M1).

### ADR-10 — Design system e animações
- Identidade nova "**Vesti**": editorial, tons quentes neutros, tipografia serifada para títulos, acento terracota. Tokens em `src/ui/theme/tokens.ts` (cores semânticas claro/escuro, tipografia, espaçamento base 4, raios, elevação, durações).
- Componentes: `Text`, `Button`, `IconButton`, `TextField`, `Screen`, `AppHeader`, `ProductCard`, `Price`, `Badge`, `Chip`, `QuantityStepper`, `ColorSwatch`, `LoadingState`, `Reveal`, `Logo`, `EmptyState`, `ErrorState`, `Toast`, `PressableScale`, `RatingStars`, `Divider`, `ListItem`.
- Animações com **Reanimated 4** (sobre `react-native-worklets`; callbacks para o JS com `scheduleOnRN`): feedback de toque por escala na UI thread, entrada de telas com revelação do conteúdo real (`Reveal`, ver docs/07), splash animada, bounce do badge do carrinho, toast. Todas respeitam `useReducedMotion()` (fallback para transições instantâneas/opacity). Haptics leves em ações de carrinho.

## 3. Contrato da API (v1, prefixo `/v1`)

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/health` · `/health/ready` | — | liveness · readiness (consulta o banco) |
| POST | `/v1/auth/register` | — | cria conta → `{ user, tokens }` (201) |
| POST | `/v1/auth/login` | — | `{ user, tokens }` |
| POST | `/v1/auth/refresh` | — | rotação: `{ tokens }` |
| POST | `/v1/auth/logout` | — | revoga a família do refresh token (204) |
| GET | `/v1/me` | ✓ | perfil |
| GET | `/v1/products?search&sort&page&pageSize` | — | `{ data, page, pageSize, total }`; `sort ∈ featured,price_asc,price_desc,newest` |
| GET | `/v1/products/:id` | — | detalhe com cores, imagens e estoque |
| POST | `/v1/cart/quote` | — | preços/estoque/totais calculados no servidor |
| GET/POST | `/v1/addresses` | ✓ | listar/criar endereços próprios |
| DELETE | `/v1/addresses/:id` | ✓ | remover endereço próprio |
| POST | `/v1/orders` | ✓ | cria pedido (header `Idempotency-Key`) |
| GET | `/v1/orders?page&pageSize` | ✓ | pedidos do usuário |
| GET | `/v1/orders/:id` | ✓ | detalhe (404 se não for do usuário) |

## 4. Plano de implementação e critérios de conclusão

| Etapa | Entrega | Critério objetivo de conclusão |
|---|---|---|
| 1. Auditoria | `docs/01`, `docs/02` | Problemas com evidência e criticidade; ADRs e contrato definidos |
| 2. Equipe de IA | `.claude/agents/*.md` (9), `.claude/skills/*/SKILL.md` (12) | Arquivos válidos com frontmatter; cada skill com procedimento, critérios, erros comuns e validação |
| 3. Backend | Fastify + `pg` + migrations + testes | `pnpm typecheck`, `pnpm lint`, `pnpm test` verdes; migrations aplicam do zero; nenhum arquivo/dependência Prisma ou Nest |
| 4. Fundação mobile | design system, navegação, http client, sessão | `tsc --noEmit` sem erros; testes de componentes base verdes |
| 5. Funcionalidades | todas as telas do escopo, integradas à API real | fluxos executados no emulador contra o backend local |
| 6. Segurança/performance | `docs/04-seguranca-e-performance.md` | testes de IDOR, manipulação de preço, concorrência de estoque, refresh reuse verdes; medições registradas; `pnpm audit --prod` sem críticas/altas no server |
| 7. Revisão independente | relatório do revisor | achados corrigidos ou justificados; testes reexecutados |
| 8. Validação local | `README.md` raiz, `docs/05-execucao-local.md` | banco → migrations → seed → API → app no emulador; checagem documentada da conectividade |
