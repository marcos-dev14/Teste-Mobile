# 03 — Convenções de engenharia

Referência única para agentes, skills e pessoas. Skills em `.claude/skills/` apontam para cá em vez de repetir regras.

## Geral
- TypeScript `strict` nos dois projetos. Proibido `any` implícito; `any` explícito só com comentário justificando.
- Nomes de arquivo em `kebab-case`; componentes React em `PascalCase` exportados nomeados (sem `export default`, exceto rotas do Expo Router, que exigem).
- Sem código morto, sem `console.log` em código de produção (backend usa `request.log`/`app.log`).
- Commits pequenos, no imperativo, prefixo convencional (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`).
- Toda mudança que afeta **arquitetura, persistência, autenticação ou contrato da API** passa pelo agente `fullstack-reviewer` antes de ser considerada concluída.
- Arquivos tocados por mais de um agente: o `software-architect` define a ordem; um agente por arquivo por vez.

## Backend (`server/`)
- Camadas por módulo: `routes.ts` (HTTP: schemas, status, auth) → `service.ts` (regra de negócio, transações) → `repository.ts` (SQL). Rotas não fazem SQL; repositórios não conhecem HTTP.
- Repositórios recebem `Queryable` como primeiro argumento. SQL sempre parametrizado (`$1`), nunca interpolado.
- Erros de domínio: `throw new AppError(status, code, message, details?)` via helpers (`notFound`, `conflict`, …). Nunca `throw new Error` para erro esperado.
- Toda rota declara `schema.body/querystring/params` **e** `schema.response` com Zod. Entradas `strict()`.
- Identidade só via `request.user.sub` (preenchido por `app.authenticate`). Nenhum schema de entrada aceita `userId`.
- Dinheiro em centavos (`*Cents`, inteiro). Datas em ISO 8601 UTC.
- Testes: `*.test.ts` ao lado do código (unidade) e `test/*.test.ts` (integração com Postgres real via `app.inject`).

## Mobile (`mobile/`)
- Rotas em `src/app/` são finas: compõem componentes de `src/features/*` e `src/ui/*`.
- Nenhuma cor, tamanho de fonte, raio ou espaçamento literal fora de `src/ui/theme/tokens.ts` (exceção: valores derivados de layout, como larguras calculadas).
- Estilos com `useStyles(factory)` (memoizado por tema). Nada de estilos inline recriados a cada render em listas.
- Toda tela com dados remotos trata **carregando (`LoadingState`, sem skeleton) · erro (com "tentar novamente") · vazio · sucesso**.
- Todo elemento tocável tem `accessibilityRole` e `accessibilityLabel` (quando não há texto), área mínima de 44×44 dp (`hitSlop` se necessário).
- Animações via Reanimated em propriedades de transform/opacity; respeitar `useReducedMotion()`.
- Chamadas HTTP somente via `src/lib/api/client.ts`; tipos de contrato em `src/lib/api/types.ts`.
- Query keys centralizadas em `src/lib/query-keys.ts`; chaves de dados do usuário incluem `userId`.

## Critérios de "pronto" (Definition of Done)
1. `typecheck`, `lint` e `test` verdes no projeto afetado.
2. Contrato da API atualizado em `docs/02-arquitetura.md` se mudou.
3. Estados de UI completos e acessibilidade verificados (mobile).
4. Sem segredos no código; variáveis novas documentadas em `.env.example`.
5. Revisão independente registrada quando aplicável.
