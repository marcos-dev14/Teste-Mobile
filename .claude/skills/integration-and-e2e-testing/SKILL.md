---
name: integration-and-e2e-testing
description: Estratégia e procedimentos de teste do projeto — unitários e integração da API com Postgres real (Vitest + app.inject), testes de componentes/hooks no app (jest-expo + Testing Library) e roteiro ponta a ponta no emulador. Use ao escrever testes, investigar falhas ou validar um fluxo completo.
---

# Testes de integração e ponta a ponta

## Pirâmide
| Camada | Ferramenta | Onde | Foco |
|---|---|---|---|
| Unidade (server) | Vitest | `server/src/**/*.test.ts` | cálculo de preço, senhas, paginação, erros |
| Integração (server) | Vitest + `app.inject` + Postgres `ecommerce_test` | `server/test/*.test.ts` | rotas, auth, IDOR, transações, concorrência |
| Componentes/hooks (app) | jest-expo + @testing-library/react-native | `mobile/src/**/__tests__/*.test.tsx` | estados de UI, store do carrinho, cliente HTTP |
| Ponta a ponta | roteiro manual guiado no emulador + `curl` | `docs/05-execucao-local.md` | fluxo de compra real |

## Backend
- `pnpm test` executa migrations no banco de teste (`DATABASE_URL_TEST`) uma vez (`test/global-setup.ts`) e cada arquivo limpa as tabelas com `TRUNCATE … RESTART IDENTITY CASCADE` **somente** no banco de teste (o helper aborta se o nome do banco não terminar em `_test`).
- Fábricas em `test/helpers.ts`: `createUser`, `login`, `seedCatalog`. Nada de depender da ordem dos testes.
- Concorrência: dispare N pedidos em paralelo (`Promise.all`) pelo último item em estoque; esperado exatamente 1 sucesso e N-1 `409 INSUFFICIENT_STOCK`, estoque final 0.

## Mobile
- Renderize com `renderWithProviders` (`QueryClient` sem retry, tema, safe area mock). Mocke a rede no nível de `apiClient`, não do axios interno.
- Teste estados: indicador de carregamento → conteúdo real; erro → botão "Tentar novamente" refaz a query; lista vazia.
- Store do carrinho testada como função pura (add/merge/limite/remove).

## Ponta a ponta (emulador)
Roteiro: abrir app → catálogo carrega da API → buscar "calça" → ordenar por preço → detalhe → trocar cor → adicionar 2 → carrinho mostra total do servidor → checkout pede login → cadastrar → endereço → pagamento → revisar → confirmar → tela de sucesso com número → "Meus pedidos" lista o pedido → derrubar a API e verificar estado de erro com retry.

## Erros comuns
- Teste que passa com mock mas não exercita o risco real (ex.: mockar o repositório no teste de IDOR).
- Esperas por tempo fixo; use `findBy*`/`waitFor`.
- Rodar testes de integração contra o banco de desenvolvimento.

## Validação
`server: pnpm test` e `mobile: pnpm test` verdes; roteiro e2e executado com resultado registrado (ou limitação explícita).
