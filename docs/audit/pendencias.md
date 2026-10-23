# Pendências para fechar a auditoria

Situação em 2026-10-23. O trabalho técnico da branch `feat/audit-hardening` está feito e testado (servidor 153/153, app 109/109). Este documento lista **o que ainda falta** e quem precisa agir. Detalhes de cada item: [backlog.md](backlog.md); bloqueios B-xx: [README.md](README.md#bloqueios).

Legenda de quem destrava: **Eu** (responsável pelo projeto) · **Externo** (contador, jurídico, provedor, Expo/Stripe) · **Código** (pode ser feito a qualquer momento, sem dependência).

## 1. Para fechar a branch

| # | Pendência | Quem | Observação |
|---|---|---|---|
| 1.1 | Commit e push do último lote (exclusão de conta, migration 0006, política atualizada, texto do "Sair") | Código | Pronto para commit |
| 1.2 | Testar em **celular Android com build de release**: cartão (aprovado, recusado, 3DS), Pix (contagem regressiva e expiração), boleto, cancelar pedido, excluir conta, animações | Eu | Emulador já testado (2026-10-22). Roteiro: [testing-plan.md §4](testing-plan.md) |
| 1.3 | Abrir o PR para `main` e fazer o merge | Eu | — |
| 1.4 | *(recomendado)* CI no GitHub: typecheck, lint, testes com Postgres, `expo export` web/Android, `pnpm audit` (QA-04) | Código | Hoje nada roda automaticamente nos PRs |
| 1.5 | *(recomendado)* Atualizar `expo-router` 57.0.28 → ~57.0.29 (versão esperada pelo SDK) | Código | Apontado por `npx expo install --check` |

## 2. Antes de publicar nas lojas — depende de decisão ou de terceiros

| # | Pendência | Quem | Destrava |
|---|---|---|---|
| 2.1 | Identificação do controlador (pessoa física ou jurídica; razão social, CNPJ e endereço se houver) | Eu | Política, termos, canal do titular (B-01) |
| 2.2 | Criar o e-mail do canal de privacidade; avaliar se é preciso nomear encarregado (DPO) | Eu | Política, LGPD-06, LGPD-10 |
| 2.3 | Prazo de guarda de pedidos e registros de compra após a exclusão da conta | Externo (contador) | Política §5; descarte automático depois do prazo (B-02) |
| 2.4 | Prazo de expiração dos backups e procedimento para dados excluídos não ficarem neles | Eu + provedor | Política §5 (B-02) |
| 2.5 | Confirmar que 6 meses de logs se aplica e configurar a retenção no provedor | Externo (jurídico) + provedor | Política §5, SEC-05 |
| 2.6 | Escolher hospedagem, banco, logs, monitoramento e e-mail transacional (e país/região de cada um) | Eu | Política §4, LGPD-07, OBS-01, SEC-04 (B-03, B-06) |
| 2.7 | Política de troca, devolução, frete e cancelamento | Eu | Termos de uso (LGPD-09, B-04) |
| 2.8 | Bases legais e transferência internacional (Stripe nos EUA) | Externo (jurídico) | Política §3 e §4 |
| 2.9 | Revisão jurídica da política e dos termos e publicação em URL pública, com link no app | Externo (jurídico) + Eu | LGPD-01, exigência das lojas |
| 2.10 | Ativar a conta Stripe para produção e decidir formalmente trocar para chaves live (o código hoje recusa live) | Eu + Stripe | [checkout-stripe.md §8](checkout-stripe.md) |
| 2.11 | Gerar novas chaves do Stripe antes de produção (a chave de teste foi exposta em conversa) | Eu | RR-11 |
| 2.12 | Parcelamento no cartão: Stripe Brasil não oferece; aguardar o Stripe ou adotar outro gateway | Externo (Stripe) / Eu | PAY-11 (B-07) |
| 2.13 | Falha conhecida de `decode-uri-component` via deep link: aguardar correção no Expo | Externo (Expo) | SEC-02 |
| 2.14 | Regra do boleto: 3 boletos abertos bloqueiam novas compras por até ~7 dias | Eu | RR-02 |

## 3. Pode ser feito a qualquer momento (só código)

| # | Pendência | Backlog |
|---|---|---|
| 3.1 | Exportar meus dados (JSON com perfil, endereços e pedidos) | LGPD-03 |
| 3.2 | Editar nome e endereços | LGPD-04, ADDR-04 |
| 3.3 | Rascunhos dos termos de uso e do plano de resposta a incidentes, com campos `[PENDENTE]` | LGPD-08, LGPD-09 |
| 3.4 | E2E dos fluxos de compra (Maestro) | QA-01 |
| 3.5 | `/health/ready` com cache; benchmark versionado; métricas por rota | SEC-03, PERF-01, OBS-02 |

## 4. Na infraestrutura de produção (quando houver deploy)

- Agendar `pnpm jobs:run` (a cada minuto) e `pnpm db:integrity` com alerta; desligar o intervalo interno se houver mais de uma instância (RR-07).
- `TRUST_PROXY` com os IPs do proxy real; limites de taxa compartilhados (Redis) com mais de uma instância (SEC-01, RR-06).
- Webhook live do Stripe com o segredo em cofre.
- Backups com restauração testada.
- Teste de carga do checkout.

Lista completa de condições de produção: [residual-risks.md](residual-risks.md#condições-antes-de-produção).
