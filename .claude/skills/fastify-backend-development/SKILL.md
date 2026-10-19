---
name: fastify-backend-development
description: Como estruturar e desenvolver o backend Fastify 5 + Zod 4 + pg deste projeto — módulos, schemas de entrada/saída, autenticação, erros padronizados, logs e testes. Use ao criar ou alterar rotas, serviços ou repositórios em server/.
---

# Backend Fastify

Convenções: `docs/03-convencoes.md`. Persistência: skill `database-migrations-and-queries`. Segurança: skill `application-security-review`.

## Estrutura
```
server/src/
  app.ts                 buildApp({ config, db }) → registra plugins e módulos (composição explícita)
  server.ts              entrada: carrega env, cria pool, listen, graceful shutdown
  config/env.ts          schema Zod das variáveis de ambiente
  db/                    pool.ts · transaction.ts · migrate.ts · seed.ts
  lib/                   errors.ts · zod-compiler.ts · passwords.ts · pagination.ts
  plugins/               auth.ts (jwt + app.authenticate) · security.ts (helmet, cors, rate-limit) · error-handler.ts
  modules/<recurso>/     schemas.ts · routes.ts · service.ts · repository.ts · *.test.ts
server/test/             integração com Postgres real (app.inject)
```

## Procedimento para uma rota nova
1. Schemas em `schemas.ts`: entrada `z.object({...}).strict()`, resposta explícita. Exporte os tipos com `z.infer`.
2. Repositório: funções `(db: Queryable, ...) => Promise<T>` com SQL parametrizado; mapeie `snake_case → camelCase` em um único `toX(row)`.
3. Serviço: regra de negócio; usa `withTransaction` quando há mais de uma escrita ou leitura-para-escrita; lança `AppError`.
4. Rota: `app.route({ method, url, schema: { body, querystring, params, response: { 200: ... } }, onRequest: [app.authenticate], handler })`. Identidade = `request.user.sub`.
5. Registre o módulo em `app.ts`. Atualize o contrato em `docs/02-arquitetura.md` e os tipos do app.
6. Testes de integração: sucesso, 400 (entrada inválida e campo extra), 401 (sem token), 404 (recurso de outro usuário), regra de negócio.

## Erros
`AppError(statusCode, code, message, details?)`. Códigos estáveis em `SCREAMING_SNAKE_CASE` (`VALIDATION_ERROR`, `UNAUTHORIZED`, `NOT_FOUND`, `CONFLICT`, `INSUFFICIENT_STOCK`, `RATE_LIMITED`, `INTERNAL_ERROR`). O app decide a mensagem por `code`.

## Erros comuns
- Esquecer `response` schema (vaza colunas novas automaticamente).
- `await` de várias escritas fora de transação.
- Usar `reply.send` e `return` juntos; lançar `Error` comum para erro esperado (vira 500).
- Logar `request.body` inteiro.

## Validação
`npm run typecheck && npm run lint && npm test` verdes; `curl` na rota contra a API local com e sem token.
