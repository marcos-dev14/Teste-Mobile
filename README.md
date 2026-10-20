# Vesti — mini e-commerce (v2)

Aplicativo mobile de e-commerce (Expo / React Native) com API própria (Node.js + Fastify + PostgreSQL).
Esta versão é uma reengenharia completa do teste prático original (NestJS + Prisma + NativeWind). O histórico da v1 está no branch `main`.

| Camada | Tecnologia |
|---|---|
| App | Expo SDK 57 · React Native 0.86 · React 19 · Expo Router 57 · TypeScript 6 · React Query · Zustand · Reanimated 4 · expo-image · expo-secure-store |
| API | Node.js 24 · Fastify 5 · Zod 4 · @fastify/jwt · helmet · CORS · rate limit · pino |
| Banco | PostgreSQL 16 · `pg` (SQL explícito, sem ORM) · migrations SQL versionadas com checksum |
| Testes | Vitest + Postgres real (API) · jest-expo + Testing Library (app) |

## Funcionalidades
- Catálogo com busca no servidor (sem diferenciar acentos), ordenação, paginação infinita e grade responsiva.
- Detalhe do produto com variações de cor, estoque por cor e galeria.
- Sacola persistida no aparelho, com preços, estoque e totais **calculados pelo servidor**.
- Cadastro e login com sessão segura (access token em memória e refresh token rotativo no SecureStore).
- Checkout em 3 etapas (entrega → pagamento → revisão) com pedido transacional e idempotente.
- Histórico e detalhe de pedidos; gerenciamento de endereços.
- Identidade visual própria (logo, ícone, splash animada) e entrada de telas que revela o conteúdo real, sem skeleton.
- Tema claro/escuro, acessibilidade (rótulos, papéis, áreas de toque ≥ 44 dp), estados de carregamento/erro/vazio/offline.

## Início rápido
```powershell
# 1) Banco
cd server
docker compose up -d

# 2) API
copy .env.example .env    # defina JWT_SECRET (instruções no arquivo)
pnpm install
pnpm db:migrate
pnpm db:seed
pnpm dev               # http://0.0.0.0:3333

# 3) App (em outro terminal, com o emulador aberto)
cd mobile
pnpm install
pnpm expo start            # pressione "a" para abrir no emulador Android
```
Conta de demonstração (somente desenvolvimento): `demo@vesti.dev` / `vesti1234`.

Guia completo, verificação de rede emulador ↔ API e troubleshooting: **[docs/05-execucao-local.md](docs/05-execucao-local.md)**.

## Comandos
| Onde | Comando | O que faz |
|---|---|---|
| server | `pnpm dev` | API com recarga automática |
| server | `pnpm build` / `pnpm start` | build e execução compilada |
| server | `pnpm db:migrate` / `db:status` / `db:seed` | migrations e dados de desenvolvimento |
| server | `pnpm db:cleanup` | descarta refresh tokens expirados há mais de 7 dias (agendar em produção) |
| server | `pnpm typecheck` / `lint` / `test` | qualidade (testes usam apenas o banco `ecommerce_test`) |
| mobile | `pnpm expo start` | Metro + Expo Go |
| mobile | `pnpm typecheck` / `lint` / `test` | qualidade |

## Documentação
| Documento | Conteúdo |
|---|---|
| [01 — Auditoria](docs/01-auditoria.md) | Problemas do sistema original, com evidência e criticidade |
| [02 — Arquitetura](docs/02-arquitetura.md) | ADRs, contrato da API e plano por etapas |
| [03 — Convenções](docs/03-convencoes.md) | Padrões de código e Definition of Done |
| [04 — Segurança e performance](docs/04-seguranca-e-performance.md) | Modelo de ameaças, revisão, medições |
| [05 — Execução local](docs/05-execucao-local.md) | Passo a passo, emulador, validação ponta a ponta |
| [06 — Pendências e futuro](docs/06-pendencias-e-futuro.md) | Limitações conhecidas e próximos passos |
| [07 — Identidade visual e movimento](docs/07-identidade-visual-e-movimento.md) | Marca, splash animada e sistema de entrada de telas |
| [Auditoria 2026-10](docs/audit/README.md) | Segurança, LGPD, checkout/Stripe, performance, backlog e bloqueios |

## Equipe de agentes (Claude Code)
Agentes especializados em `.claude/agents/`: arquiteto, mobile, UI/UX, motion, backend, banco de dados, segurança, performance e revisor full stack. Skills reutilizáveis em `.claude/skills/` documentam os procedimentos de cada área.
