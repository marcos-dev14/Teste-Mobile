# Backlog priorizado

Agentes: **A1** Segurança backend · **A2** Segurança mobile · **A3** Stripe/checkout · **A4** Privacidade/LGPD · **A5** Performance backend · **A6** Performance/UX mobile · **A7** QA. Coordenação e contratos: coordenador (dono único de migrations e de `docs/02` / `lib/api/types.ts`).

Status: ✅ concluído e validado · 🟡 parcial · ⛔ bloqueado · ⬜ a fazer. Esforço: P (≤ 0,5 dia), M (1–2 dias), G (3+ dias).

## Resumo

| ID | Título | Agente | P | Risco | Esf. | Depende | Status |
|---|---|---|---|---|---|---|---|
| PAY-01 | Confirmação honesta: pedido recebido ≠ pago | A3/A6 | P1 | Baixo | P | — | ✅ |
| PAY-02 | Estados de pedido/pagamento + tabelas de pagamento | A3 | P1 | Alto | M | — | ✅ |
| PAY-03 | PaymentIntent por pedido + guarda `sk_test_`/`pk_test_` | A3 | P1 | Alto | M | PAY-02 | ✅ |
| PAY-04 | Webhook Stripe assinado, idempotente, monotônico | A3/A1 | P1 | Alto | M | PAY-02 | ✅ validado com `stripe listen` |
| PAY-05 | Reserva de estoque com expiração | A3/A5 | P1 | Médio | M | PAY-02 | ✅ |
| PAY-06 | Painel de cartão do app (campos do Stripe.js) + tela de resultado | A3/A6 | P1 | Médio | M | PAY-03 | 🟡 falta rodar no aparelho |
| PAY-07 | Cancelamento pelo cliente e reembolso automático | A3 | P2 | Médio | M | PAY-04 | ✅ |
| PAY-08 | Limite de pedidos pendentes por usuário | A1/A3 | P2 | Baixo | P | PAY-02 | ✅ |
| PAY-09 | Reconciliação quando o webhook não chega | A3 | P2 | Médio | M | PAY-04 | ✅ |
| PAY-10 | Pix e boleto via Stripe | A3 | P2 | Médio | M | — | ✅ modo de teste (produção: checkout-stripe §8) |
| PAY-11 | Parcelamento no cartão | A3 | P2 | Médio | G | B-07 | ⛔ Stripe Brasil não oferece |
| LGPD-01 | Política de privacidade no app e em URL | A4/A6 | P1 | Baixo | P | B-01 | 🟡 rascunho |
| LGPD-02 | Exclusão de conta | A4/A1 | P1 | Alto | M | B-02 | ⛔ |
| LGPD-03 | Exportação de dados do titular | A4 | P2 | Baixo | P | — | ⬜ |
| LGPD-04 | Edição de perfil e endereço | A4/A6 | P2 | Baixo | M | ADDR-02 | ⬜ |
| LGPD-05 | Descarte de refresh tokens expirados | A4/A1 | P2 | Baixo | P | — | ✅ |
| LGPD-06 | Procedimento de atendimento a titulares | A4 | P2 | — | P | B-01 | ⛔ |
| LGPD-07 | Avaliação de fornecedores | A4 | P2 | — | P | B-03 | ⛔ |
| LGPD-08 | Plano de resposta a incidentes | A4/A1 | P2 | — | P | B-01 | ⬜ |
| LGPD-09 | Termos de uso e condições de compra | A4 | P1 | — | P | B-01, B-04 | ⛔ |
| LGPD-10 | Canal do encarregado | A4 | P1 | — | P | B-01 | ⛔ |
| ADDR-01 | Consulta de CEP no backend (proxy, cache, fallback) | A1/A5 | P2 | Médio | M | — | ✅ |
| ADDR-02 | Número, bairro e UF validada no endereço | Coord. | P2 | Médio | P | — | ✅ |
| ADDR-03 | Preenchimento automático no app | A6 | P2 | Baixo | M | ADDR-01/02 | ✅ |
| ADDR-04 | Editar endereço | A6 | P3 | Baixo | M | ADDR-02 | ⬜ |
| CART-01 | Badge e "bump" no ícone da sacola da tela de produto | A6 | P2 | Baixo | P | — | ✅ |
| CART-02 | Voo até a sacola, estado "Na sacola", guarda de toque duplo | A6 | P2 | Baixo | M | CART-01 | ✅ |
| CART-03 | Sacola sincronizada no servidor (multi-aparelho) | A3/A6 | P3 | Médio | G | — | ⬜ proposta |
| SEC-01 | Rate limit por conta + store compartilhado | A1 | P2 | Baixo | M | infra | ⬜ |
| SEC-02 | `decode-uri-component` alcançável via deep link | A2 | P2 | Médio | P | upstream | ⛔ |
| SEC-03 | `/health/ready` limitado/cacheado | A1 | P3 | Baixo | P | — | ⬜ |
| SEC-04 | Recuperação de senha | A1 | P2 | Médio | M | B-06 | ⛔ |
| SEC-05 | Retenção e minimização dos logs | A1/A4 | P2 | Baixo | P | infra | ⬜ |
| PERF-01 | Script de benchmark versionado + rebaseline | A5 | P2 | Baixo | P | — | ⬜ |
| PERF-02 | Paginação keyset | A5 | P3 | Médio | M | — | ⬜ |
| PERF-03 | Variantes de imagem por tamanho | A5/A6 | P3 | Baixo | P | — | ⬜ |
| PERF-04 | Medição de render/FPS em build de release | A6 | P3 | — | P | build | ⬜ |
| OBS-01 | Monitoramento de crash/erros | A6/A1 | P2 | Baixo | P | B-03 | ⛔ |
| OBS-02 | Métricas de latência/erro por rota | A5 | P2 | Baixo | M | — | ⬜ |
| QA-01 | E2E (Maestro) dos fluxos de compra | A7 | P2 | — | M | — | ⬜ |
| QA-02 | Suíte de testes do Stripe (ver checkout-stripe §7) | A7 | P1 | — | M | PAY-02…10 | 🟡 falta 3DS e telas no aparelho |
| QA-04 | CI (typecheck, lint, test, audit) | A7 | P2 | Baixo | P | — | ⬜ |
| QA-05 | Handle aberto no Jest | A7 | P3 | Baixo | P | — | 🟡 timer do toast corrigido; aviso persiste na suíte completa |

## Detalhamento

### PAY-01 — Confirmação honesta ✅
- **Problema**: a tela final dizia "Pedido confirmado… já está em preparação" sem cobrança; o app decidia sozinho que a compra estava concluída (S-01).
- **Solução**: título "Pedido recebido" e aviso de que o pagamento é simulado neste ambiente; status "Recebido" mantido. **Arquivos**: `mobile/src/app/checkout/success.tsx`.
- **Aceite**: nenhum texto do app afirma pagamento/preparação sem confirmação do servidor. **Testes**: teste de componente da tela. **Rollback**: reverter o arquivo.

### PAY-02…PAY-10
Implementação, contratos, máquina de estados e resultados dos testes em [checkout-stripe.md](checkout-stripe.md). **Arquivos**: `server/db/migrations/0003_payments.sql`, `server/src/modules/payments/*`, `server/src/modules/orders/*`, `server/src/config/env.ts`, `server/src/app.ts`; `mobile/src/features/payments/*`, `mobile/src/app/checkout/{payment,review,success}.tsx`, `mobile/src/app/orders/[id].tsx`. **Rollback**: migration aditiva; as chaves existem apenas no `.env`.

### PAY-11 — Parcelamento no cartão ⛔
- **Problema**: compra só à vista no cartão; no Brasil o cliente espera parcelar.
- **Evidência (2026-10-22, modo de teste)**: conta Stripe `country: BR`. Um PaymentIntent em BRL com `payment_method_options.card.installments.enabled=true` é aceito, mas `available_plans` vem **vazio** também com o cartão de teste brasileiro (`pm_card_br`). A documentação do Stripe só descreve parcelamento para México, Japão e Mastercard Installments.
- **Opções**: (a) confirmar com o suporte do Stripe se há previsão para o Brasil; (b) usar um adquirente/gateway com parcelamento nacional (decisão de negócio; muda integração, taxas, webhooks e a auditoria de pagamento); (c) **não** simular parcelas com cobranças mensais (não é parcelamento do emissor: risco de inadimplência e de estoque, e confunde o cliente).
- **Bloqueio**: B-07.

### LGPD-01 — Política de privacidade 🟡
- **Problema**: não existe política nem link no app (P-04). **Evidência**: `grep` sem resultados.
- **Solução**: rascunho fiel às práticas reais em [`docs/legal/politica-de-privacidade.md`](../legal/politica-de-privacidade.md) com campos `[PENDENTE]`; depois, link em Perfil e Cadastro e URL pública.
- **Aceite**: documento sem informação inventada; publicado só após B-01 e revisão jurídica. **Rollback**: n/a.

### LGPD-02 — Exclusão de conta ⛔
- **Problema**: impossível excluir a conta (P-01); `orders.user_id ON DELETE RESTRICT`.
- **Solução**: `DELETE /v1/me` com senha; numa transação: revogar todos os refresh tokens, apagar endereços, anonimizar `users` (nome "Conta excluída", e-mail `deleted+<uuid>@invalid`, hash inutilizável, `deleted_at`), manter pedidos pelo prazo legal; `authenticate` rejeita contas excluídas (fecha a janela de 15 min, S-10). App: Perfil → "Excluir conta" com confirmação.
- **Bloqueio**: B-02 (prazo de guarda dos pedidos). **Testes**: login falha após exclusão; token antigo → 401; pedidos inacessíveis a terceiros; endereços removidos. **Risco**: alto (irreversível) — exige revisão.

### LGPD-03 — Exportação ⬜
`GET /v1/me/export` (JSON com perfil, endereços, pedidos), rate limit baixo. Aceite: só dados do próprio titular; teste de isolamento.

### LGPD-04 — Edição ⬜
`PATCH /v1/me` (nome) e `PATCH /v1/addresses/:id`; troca de e-mail exige reautenticação. Testes de IDOR.

### LGPD-05 — Descarte de tokens ✅
- **Problema**: `refresh_tokens` cresce para sempre (S-08). **Solução**: `pnpm db:cleanup` remove tokens expirados há mais de 7 dias (a família continua detectável enquanto o token vale). **Arquivos**: `server/src/db/cli.ts`, `auth/repository.ts`. **Testes**: integração (`test/auth.test.ts`). **Pendência**: agendar (cron do provedor) quando houver deploy. **Rollback**: não executar o comando.

### ADDR-01/02/03 ✅
Especificação em [address-and-cart.md](address-and-cart.md).
- **Arquivos**: `server/db/migrations/0002_address_details.sql`, `server/src/modules/addresses/{zip-code.ts,schemas.ts,repository.ts,routes.ts}`, `server/src/modules/orders/{schemas.ts,service.ts}`, `server/src/app.ts`; `mobile/src/features/addresses/{address-form.tsx,address-card.tsx,api.ts}`, `mobile/src/lib/api/types.ts`, `mobile/src/ui/components/text-field.tsx`.
- **Aceite**: autopreenchimento para CEP válido; campos editáveis; falha externa não bloqueia; loading/erro/timeout; sem chamada duplicada; servidor valida UF/número/bairro.
- **Testes**: provedor (unidade, fetch falso: encontrado, inexistente, fallback, timeout, cache, deduplicação, dado malicioso), rota (auth, 400/404/503), criação com novos campos e UF inválida, formulário no app (preenche, não sobrescreve edição, falha não bloqueia, CEP repetido sem nova chamada).
- **Rollback**: migration aditiva (colunas nuláveis); reverter o código mantém o banco compatível.

### CART-01/02 ✅
Especificação em [address-and-cart.md §2](address-and-cart.md). **Arquivos**: `mobile/src/features/cart/components/cart-icon-button.tsx`, `fly-to-cart.tsx`, `mobile/src/app/product/[id].tsx` (a tab bar já tinha badge com bounce e não foi alterada). **Pendente**: conferência de fluidez em build de release no aparelho (testing-plan §4). **Testes**: adicionar atualiza badge e rótulo; toque duplo rápido adiciona uma vez; limite atingido não anima nem adiciona. **Rollback**: reverter os arquivos (sem dados envolvidos).

### SEC-01 ⬜
Limite por e-mail no login (ex.: 5 falhas/15 min) além do limite por IP; store Redis quando houver mais de uma instância; documentar `TRUST_PROXY`. Teste: 6ª tentativa com IPs diferentes → 429.

### SEC-02 ⛔
Aguardar `expo-router`/`query-string` com `decode-uri-component ≥ 0.5`. Override manual já quebrou o router (docs/04 §4). Reavaliar a cada atualização do SDK.

### SEC-03 ⬜
`/health/ready` com cache de 1–2 s do resultado do `SELECT 1`, ou exposto só na rede interna.

### SEC-04 ⛔
Recuperação de senha com token de uso único (hash, 30 min), resposta neutra (não revela e-mail) e revogação de sessões. Bloqueio: provedor de e-mail (B-06).

### SEC-05 ⬜
Definir destino e retenção dos logs (sugestão: 90 dias); avaliar truncar o último octeto do IP em logs de acesso não relacionados a segurança.

### PERF-01…04, OBS-01/02 ⬜
Ver [performance.md §3](performance.md).

### QA-01 ⬜ · QA-04 ⬜ · QA-05 ⬜
Maestro (fluxos: catálogo → sacola → checkout → pedido; endereço por CEP); workflow de CI com Postgres de serviço; investigar timer não liberado nos testes do app.
