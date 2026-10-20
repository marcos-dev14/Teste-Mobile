---
name: application-security-review
description: Checklist e procedimento de revisão de segurança do app mobile, da API Fastify e do banco — autenticação, autorização por recurso (IDOR), integridade de preços/estoque, tokens, segredos, logs, rate limiting, CORS e dependências. Use antes de concluir qualquer mudança em auth, pedidos, endereços, contrato da API ou dependências.
---

# Revisão de segurança

Premissa: cliente e rede são hostis. O servidor decide identidade, preço, estoque e posse.

## Modelo de ameaças (resumo)
| Ativo | Ameaça | Controle |
|---|---|---|
| Conta | força bruta, enumeração | rate limit 10/min no login; scrypt; hash fictício em usuário inexistente; mensagem genérica |
| Sessão | roubo de token | access 15 min; refresh opaco com hash no banco, rotação e detecção de reuso; SecureStore |
| Pedidos/endereços | IDOR | `user_id` do token em todo SQL; 404 para recurso alheio |
| Preço/estoque | manipulação | schema `strict` sem campos de preço; cálculo e lock no servidor |
| Disponibilidade | abuso | rate limit global, `bodyLimit` 64 KB, `pageSize ≤ 50` |
| Dados pessoais | vazamento | response schemas; `redact` no pino; erros genéricos em 500 |

## Checklist por mudança
- [ ] Rota nova tem `onRequest: [app.authenticate]` ou é deliberadamente pública (documentado)?
- [ ] Algum campo de entrada influencia identidade, preço, total, quantidade ou posse? Deveria?
- [ ] Toda consulta por id inclui `AND user_id = $n`?
- [ ] Resposta tem schema e não inclui hash, token ou dado de outro usuário?
- [ ] Erros não revelam stack, SQL ou existência de recurso alheio?
- [ ] Novos segredos só em `.env` (e `.env.example` com placeholder)?
- [ ] Testes de abuso adicionados (`server/test/security.test.ts`)?
- [ ] App: tokens apenas no SecureStore; nada sensível em logs/console; deep links não executam ações sem confirmação.

## Dependências
`pnpm audit --prod --audit-level high` em `server/` e `mobile/`. Classifique: **runtime alcançável** (corrigir/atualizar), **apenas build/dev** (registrar, atualizar quando o SDK permitir). Justifique formalmente o que ficar.

## Erros comuns
- Confiar em validação do app. Validar só tipo, não faixa (quantidade negativa).
- 403 em vez de 404 para recurso alheio (permite enumeração).
- Logar o body de login.

## Validação
`pnpm test` (inclui suíte de segurança) verde; `docs/04-seguranca-e-performance.md` atualizado com achados e status.
