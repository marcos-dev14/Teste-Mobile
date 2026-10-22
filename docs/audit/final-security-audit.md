# Auditoria final — segurança, integridade de compras e pagamentos

Data: 2026-10-21 · Escopo: `server/`, `mobile/`, PostgreSQL, Stripe (**somente modo de teste**) · Branch `feat/audit-hardening` (alterações ainda não commitadas na data).

Método: (1) três revisões independentes, somente leitura e em paralelo — segurança/privacidade, pagamentos/duplicidade/banco, app mobile — sem acesso ao banco nem execução de testes; (2) revisão do coordenador, que confrontou cada achado com o código; (3) execução: suítes completas, 10 cenários adversariais por **HTTP real com requisições simultâneas**, ponta a ponta com o **Stripe em modo de teste e webhooks reais** (`stripe listen`), consultas de integridade no banco de desenvolvimento; (4) para cada correção, um teste de regressão — e **prova por mutação**: com a correção desligada, o teste falha.

Nenhum resultado aqui é estimado: onde algo não pôde ser executado, está marcado.

## 1. O que está realmente implementado

Cadastro/login com JWT de 15 min e refresh token opaco rotativo com detecção de reuso; catálogo; sacola local com cotação no servidor; endereços com CEP (ViaCEP/BrasilAPI pelo servidor); pedidos transacionais com preços e estoque do banco e idempotência; pagamento por **cartão (PaymentSheet), Pix e boleto** via Stripe em modo de teste, confirmação **sempre pelo servidor** (webhook assinado ou reconciliação), reserva de estoque com expiração, cancelamento, reembolso automático; app Expo com estados de pagamento. Detalhes: [checkout-stripe.md](checkout-stripe.md).

## 2. O que foi inspecionado

Todo o código de `server/src` (rotas, serviços, repositórios, plugins, configuração, jobs), migrations `0001`–`0005`, testes existentes, `mobile/src` (checkout, pagamentos, sessão, sacola, cliente HTTP, telas de pedido), `app.json`, `.gitignore`, `.env.example`, histórico Git do branch e documentos em `docs/`.

## 3. Vulnerabilidades e falhas

**Nenhum P0 foi encontrado.** Nenhuma falha de autorização (IDOR/BOLA) foi encontrada — verificado no código e por teste adversarial em 6 rotas.

| ID | P | Classe | Achado | Status |
|---|---|---|---|---|
| A1 | **P1** | Comprovado (código) | Reembolso automático que falhava **nunca era repetido**: cliente cobrado por pedido encerrado, só um log | ✅ Corrigido |
| A2 | **P1** | Comprovado (código) | Retentativa após **reabrir o app** criava **pedido duplicado** (chave de idempotência só em memória) | ✅ Corrigido |
| A3 | **P1** | Comprovado | Sem exclusão/exportação de conta (LGPD; exigência das lojas) | ⛔ Bloqueado: decisão de retenção (B-02) |
| B1 | P2 | Comprovado (código) | Duplicata simultânea com a mesma chave podia receber **409 "estoque mudou"** em vez do pedido criado | ✅ Corrigido |
| B2 | P2 | Potencial | Cancelamento/expiração concorrendo com o 1º início de pagamento podia entregar *client secret* de pedido fechado | ✅ Corrigido |
| B3 | P2 | Comprovado (execução) | Rotina de expiração só dentro da API (pedido parado com a API fora) e sujeita a "inanição"; limpeza de sessões prometida na política não agendada | ✅ Corrigido |
| B4 | P2 | Potencial (deploy) | `TRUST_PROXY=true` permitia forjar IP e escapar do limite de login; sem limite por conta | ✅ Corrigido |
| B5 | P2 | Comprovado (código) | App: falha de uma consulta periódica trocava a tela do Pix por tela de erro | ✅ Corrigido |
| B6 | P2 | Comprovado (execução) | App: sair da revisão durante a finalização perdia a navegação (pedido criado "invisível") | ✅ Corrigido |
| B7 | P2 | Comprovado | App: CPF de teste anunciado recusado em builds de release | ✅ Corrigido |
| B8 | P2 | Comprovado (por desenho) | 3 boletos abertos bloqueiam novas compras por ~7 dias (limite de pendentes) | ⛔ Decisão de negócio |
| C1 | P3 | Comprovado (código), **não reproduzido** | Corrida de confirmação de Pix/boleto podia virar 500 | ✅ Blindado |
| C2 | P3 | Potencial | Detalhes de erro do Postgres (`detail`) podiam levar dados pessoais ao log | ✅ Corrigido |
| C3 | P3 | Preventivo | Webhook não descartava eventos `livemode` | ✅ Corrigido |
| C4 | P3 | Preventivo | Consulta de CEP seguia redirecionamentos e não limitava a resposta | ✅ Corrigido |
| C5 | P3 | Comprovado | `mobile/.env` fora do `.gitignore` | ✅ Corrigido |
| C6 | P3 | Comprovado | Tela de resultado dizia "Pedido cancelado" para pedidos pagos antigos/reembolsados; deep link sem sessão girava para sempre; botão do 404 errado; revisão sem endereço girava para sempre | ✅ Corrigido |
| C7 | P3 | Comprovado | CPF ficava em memória após sair do checkout | ✅ Corrigido |
| C8 | P3 | Potencial | Polling de Pix com a tela fora de foco, sem recuo em 429, sem parar no vencimento | ✅ Corrigido |
| C9 | P3 | Comprovado | Documentos de privacidade/segurança desatualizados em relação ao código | ✅ Corrigido (ver `user-data-privacy.md`) |
| C10 | P3 | Comprovado | Janela de 30 s no refresh token sem detecção de reuso; cadastro revela e-mail; access token vale 15 min após logout | Aceitos (trade-offs documentados em `security.md`) |
| C11 | P3 | Potencial | Pagamento com valor divergente do pedido é ignorado e só logado | Aberto → `residual-risks.md` |

### Detalhamento das correções P1/P2

| ID | Causa raiz | Correção | Arquivos | Teste de regressão (provado por mutação) | Risco de regressão / rollback |
|---|---|---|---|---|---|
| A1 | Reembolso rodava após o commit e só registrava log em falha; estado terminal impedia reprocessar | A combinação "pagamento `succeeded` + pedido `cancelled`/`expired`" passa a ser a fila durável; `retryRefunds()` roda na manutenção; chave de idempotência por pedido impede reembolso em dobro | `payments/service.ts`, `payments/repository.ts`, `jobs/maintenance.ts` | `payments.test.ts` "reembolso que falha não se perde…" | Baixo; reverter os arquivos (sem migration) |
| A2 | `idempotency` no store em memória; sacola persistida | Persistir só `{key, signature}` (ids e quantidades) em AsyncStorage; CPF nunca persistido; chave zerada ao concluir/sair da conta | `mobile/src/features/checkout/store.ts` | `checkout-intent.test.ts` (reinício simulado) | Baixo; chave antiga no aparelho só reaproveita pedido idêntico |
| B1 | `replay` antes da trava; sem rechecagem após `lockUser` | Rechecar a chave dentro da transação, após a trava | `orders/service.ts` | `orders.test.ts` "duplicata simultânea… ÚLTIMA unidade…" | Baixo |
| B2 | `start` gravava o pagamento sem trava do pedido; `cancelPending` fechava o pedido mesmo se surgisse pagamento | Gravar o pagamento sob `lockOrder` só se pendente; `cancelPending` não fecha se apareceu pagamento | `payments/service.ts` | `payments.test.ts` "cancelamento enquanto o 1º início…" | Médio (caminho crítico) — coberto por 41 testes de pagamento + e2e real |
| B3 | Rotina em processo; pedidos não canceláveis re-selecionados a cada minuto | Migration `0005` (`next_expiration_check_at`, aditiva); adiamento de 15 min; `pnpm jobs:run` para cron externo; limpeza de sessões de hora em hora; `pnpm db:integrity` para monitorar | `jobs/maintenance.ts`, `db/cli.ts`, `db/integrity.ts`, migration 0005 | `payments-async.test.ts` "…e o adia…", `integrity.test.ts` | Baixo; coluna nulável |
| B4 | `trustProxy: true` confia em qualquer `X-Forwarded-For` | `TRUST_PROXY` aceita `false`/lista de IPs-CIDRs; `true` recusado em produção (o Fastify trata contagem de saltos como "não confiar"); limite de 5 falhas/15 min **por e-mail** (inclusive inexistente) | `config/env.ts`, `lib/login-throttle.ts`, `auth/service.ts` | `login-throttle.test.ts`, `env.test.ts` | Baixo; limite em memória (uma instância) |
| B5–B7 | Ver `test-results.md` | Erro só toma a tela sem dados; finalização com callbacks no `useMutation` (comprovado: callbacks do `mutate()` são descartados ao desmontar); modo de teste vem do servidor | `mobile/src/app/checkout/*`, `features/checkout/use-submit-order.ts`, `features/payments/*` | `audit-regressions.test.tsx`, `async-payments.test.tsx` | Baixo |

## 4. Cenários de duplicidade testados

15 cenários, detalhados em [duplicate-purchase-prevention.md](duplicate-purchase-prevention.md): 12 com prevenção comprovada por execução; 3 com comportamento documentado (duas instâncias do app com chaves próprias, troca de método antes de repetir — tratados como novas intenções, limitados a 3 pedidos pendentes e **sem cobrança dupla possível**, pois cada pedido tem um único PaymentIntent).

## 5. Resultados de testes

Servidor **148/148** (era 136); app **96/96** (era 86); adversariais por HTTP **10/10**; Stripe real com webhooks: todos os cenários conforme esperado, com uma recusa transitória comprovadamente recuperável. Detalhe: [test-results.md](test-results.md).

## 6. Não executado

Painel de cartão, QR Code e boleto **em aparelho real**; autenticação 3DS; teste de carga; múltiplas instâncias da API; restauração de backup. Ver [residual-risks.md](residual-risks.md).

## 7. Riscos abertos e pendências humanas

Ver [residual-risks.md](residual-risks.md) e [user-data-privacy.md](user-data-privacy.md). Principais: exclusão/exportação de conta (B-02), regra de pendentes com boleto (B8), ativação da conta Stripe e travas de modo teste (produção), política de privacidade com dados do controlador (B-01).

## 8. Condições antes de produção

O aplicativo **não está pronto para produção**. Condições mínimas: exclusão de conta e política publicada; testes no aparelho (incluindo 3DS) em build de release; `jobs:run` e `db:integrity` agendados com alerta; logs com destino e retenção definidos; CI obrigatória (typecheck, lint, testes, `expo config`, audit); ativação da conta Stripe e decisão formal de trocar para chaves live (hoje recusadas pelo código); teste de carga do checkout.

## 9. Registro de incidente menor durante a auditoria

O revisor de segurança, ao conferir prefixos de chave no `server/.env`, imprimiu os 8 primeiros caracteres do `JWT_SECRET` **de desenvolvimento** na saída local da ferramenta. O arquivo nunca foi versionado. Recomendação: gerar novo `JWT_SECRET` de desenvolvimento (e trocar a chave secreta de teste do Stripe, que foi colada em conversa em 2026-10-20).
