# Arquitetura atual e fluxos

Auditoria de 2026-10-20 sobre o branch `main` (commit `adc3705`). Tudo aqui foi **inspecionado no código**; nada foi presumido a partir da documentação anterior (`docs/01`–`07`), que foi usada só como ponto de partida e conferida.

## 1. Mapa

```
┌──────────────────────────────┐  HTTP(S) JSON, Bearer JWT  ┌──────────────────────────────────┐  SQL (pg)  ┌──────────────────┐
│ App Expo SDK 57 / RN 0.86    │ ─────────────────────────▶ │ API Node 24 · Fastify 5 · Zod 4  │ ─────────▶ │ PostgreSQL 16    │
│ Expo Router · React Query    │                            │ módulos: auth, products, cart,   │            │ migrations SQL   │
│ Zustand (sacola, checkout)   │ ◀───────────────────────── │ addresses, orders, health        │            │ com checksum     │
│ SecureStore (refresh token)  │   erros {error:{code,...}} │ helmet · CORS · rate limit · pino│            │ citext, pg_trgm  │
│ AsyncStorage (sacola)        │                            └──────────────────────────────────┘            └──────────────────┘
└──────────────┬───────────────┘                                          │ (novo, ADDR-01)
               │ imagens (HTTPS)                                          ▼
               ▼                                               ViaCEP → BrasilAPI (fallback)
        images.unsplash.com
```

| Camada | Tecnologia (versão real no lockfile/package.json) | Evidência |
|---|---|---|
| App | Expo `~57.0.30`, React Native `0.86.3`, React `19.2.3`, Expo Router `~57.0.28`, TypeScript `~6.0.3`, React Query 5, Zustand 5, Reanimated `4.5.1`, react-hook-form + Zod | `mobile/package.json` |
| API | Fastify `^5.12.7`, `@fastify/jwt`, helmet, cors, rate-limit, Zod 4, `pg` 8 — sem ORM, sem DI | `server/package.json`, `server/src/app.ts` |
| Banco | PostgreSQL 16 (Docker, porta 5442 só em loopback), 1 migration (`0001_initial_schema.sql`) | `server/docker-compose.yml`, `server/db/migrations` |
| Testes | Vitest com Postgres real (`ecommerce_test`), jest-expo + Testing Library | `server/vitest.config.ts`, `mobile/package.json` |
| CI/CD, deploy | **Inexistentes** no repositório (sem `.github/workflows`, sem `eas.json`, sem Dockerfile da API) | `find` no repositório |
| Pagamento | **Nenhum provedor.** Método (`pix`/`credit_card`/`boleto`) só é gravado no pedido | `grep -ri stripe` sem resultados no código |

## 2. Backend

- **Composição**: `buildApp()` registra plugins (erro, segurança, auth) e módulos sob `/v1`. Cada módulo: `routes.ts` → `service.ts` → `repository.ts` (SQL parametrizado, `Queryable` aceita pool ou transação).
- **Validação**: Zod como `validatorCompiler` **e** `serializerCompiler` — entradas `strict()` rejeitam campos extras (`price`, `userId` → 400); respostas são filtradas pelo schema (campo não declarado não vaza).
- **Erros**: formato único `{ error: { code, message, details?, requestId } }`; 500 genérico, detalhe só no log.
- **Configuração**: `src/config/env.ts` valida com Zod no boot; recusa `JWT_SECRET` < 32 caracteres e o segredo de exemplo em produção.

### Contrato da API (inspecionado nas rotas)
| Método | Rota | Auth | Observação |
|---|---|---|---|
| GET | `/health`, `/health/ready` | — | sem rate limit; `ready` consulta o banco |
| POST | `/v1/auth/register` · `login` | — | 10/min/IP |
| POST | `/v1/auth/refresh` · `logout` | — | 30/min/IP; refresh opaco rotativo |
| GET | `/v1/me` | ✓ | |
| GET | `/v1/products`, `/v1/products/:id` | — | busca sem acento, ordenação por whitelist, `pageSize ≤ 50` |
| POST | `/v1/cart/quote` | — | preços e estoque calculados no servidor |
| GET/POST | `/v1/addresses` · DELETE `/v1/addresses/:id` | ✓ | máx. 10 por usuário; **sem edição** |
| POST | `/v1/orders` | ✓ | `Idempotency-Key` obrigatório; 20/min |
| GET | `/v1/orders`, `/v1/orders/:id` | ✓ | recurso alheio → 404 |

### Modelo de dados
`users` (citext e-mail, scrypt) · `refresh_tokens` (hash SHA-256, família, `replaced_by`) · `products` / `product_colors` (estoque por cor) · `addresses` · `orders` (centavos, `status` com CHECK, endereço copiado em JSONB, `UNIQUE(user_id, idempotency_key)`, fingerprint do corpo) · `order_items` (snapshot de nome, cor, imagem e preço).

Status de pedido existentes no CHECK: `placed, paid, shipped, delivered, cancelled` — **só `placed` é usado**; nada muda o status depois da criação.

## 3. App mobile

```
src/app/        rotas Expo Router: (tabs) início/busca/sacola/perfil · product/[id] · checkout/{address,payment,review,success} · orders · addresses · sign-in/up
src/features/   auth (session-store, SecureStore) · cart (store Zustand persistida, cotação) · catalog · checkout (store em memória, idempotência) · orders · addresses
src/ui/         design system (tokens, tema claro/escuro, componentes, Reveal/ScreenEntrance)
src/lib/        cliente HTTP (timeout 15 s, refresh single-flight), env, query client (NetInfo + AppState)
```

- **Sessão**: access token só em memória; refresh token + perfil (nome, e-mail) no SecureStore (Keychain/Keystore). Renovação single-flight; logout revoga a família no servidor.
- **Sacola**: local (Zustand + AsyncStorage, chave `vesti.cart.v1`), guarda ids, quantidade e um *snapshot* de exibição. Valores exibidos vêm de `POST /cart/quote`. **Não existe sacola no servidor**: adicionar item não faz requisição.
- **Checkout**: store em memória (endereço, método, chave de idempotência derivada do conteúdo). A chave é reaproveitada enquanto o conteúdo não muda.
- **URL da API**: `EXPO_PUBLIC_API_URL` ou host do Metro; build de release exige `https://`.

## 4. Fluxos principais

### Compra (estado atual)
```
Catálogo ──▶ Produto (cor, quantidade) ──▶ "Adicionar à sacola" (local + toast + haptic)
   ──▶ Sacola (cotação no servidor; ajuste de quantidade)
   ──▶ Login (se anônimo; volta ao fluxo via redirect allowlist)
   ──▶ Checkout 1/3 Endereço (lista ou formulário manual)
   ──▶ 2/3 Pagamento (só escolhe o método; aviso "demonstração")
   ──▶ 3/3 Revisão (cotação + endereço) ──▶ POST /v1/orders (transação: trava cores, recalcula, baixa estoque, grava snapshot)
   ──▶ "Pedido confirmado … já está em preparação"   ◀── sem nenhum pagamento (ver checkout-stripe.md)
   ──▶ Meus pedidos (status "Recebido" para sempre)
```

### Autenticação
Cadastro/login → `{ user, tokens }` → SecureStore. Chamada autenticada sem access token → refresh antes; 401 → refresh único e repetição; refresh recusado → sessão encerrada (sacola preservada, exceto em logout explícito).

### Endereço (estado atual)
Formulário manual: nome, CEP (máscara), "Rua e número" num campo só, complemento, cidade, estado (texto livre 2–40), país. Sem consulta de CEP, sem bairro, sem número separado, sem edição.
