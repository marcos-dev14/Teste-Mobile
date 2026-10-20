# Auditoria 2026-10 — índice e resumo executivo

Escopo: app Expo + API Fastify + PostgreSQL, branch `feat/audit-hardening` (a partir de `main@adc3705`).
Legenda usada em todos os documentos: **inspecionado** (lido no código), **implementado**, **testado** (com resultado registrado), **pendente de validação**.

## Resumo executivo

**Estado atual.** A base técnica é boa e verificável: controle de acesso por dono em todo SQL, preços e estoque decididos no servidor com travas de linha, idempotência de pedidos, sessão com refresh token rotativo e detecção de reuso, segredos fora do Git. A linha de base passou inteira (65 testes de API, 58 do app, `audit` do server limpo). **Nenhum risco P0 foi encontrado.**

**Principais riscos.**
1. **Não existe pagamento.** O pedido é criado e baixa estoque sem cobrança; o app dizia "Pedido confirmado… em preparação". O texto foi corrigido; a integração com Stripe (somente Test Mode) está especificada, mas **bloqueada por falta de chaves de teste**.
2. **Direitos do titular (LGPD) e exigência das lojas**: não há exclusão de conta, exportação nem edição de dados, nem política de privacidade publicada. Depende de decisões de negócio (retenção, dados do controlador).
3. **Estoque preso por pedidos não pagos** (só se resolve junto com o pagamento).
4. Dependência do app alcançável por deep link com DoS conhecido (`decode-uri-component`), à espera de correção upstream.

**Feito nesta rodada** (implementado e testado): consulta de CEP pelo servidor com fallback, cache e logs sem CEP; formulário de endereço com preenchimento automático, número, bairro e UF validada; feedback de "adicionar à sacola" com badge, voo até o ícone e proteção contra toque duplo; confirmação de pedido honesta; descarte de sessões expiradas; correção de timer de toast que vazava. Testes: API 65 → 81, app 58 → 70.

## Documentos

| # | Entregável | Documento |
|---|---|---|
| 1 | Resumo executivo | este arquivo |
| 2 | Mapa da arquitetura e fluxos | [architecture.md](architecture.md) |
| 3 | Inventário de dados pessoais | [privacy-lgpd.md §1](privacy-lgpd.md) |
| 4 | Relatório de segurança (+ checklist MASVS) | [security.md](security.md) |
| 5 | Relatório de performance | [performance.md](performance.md) |
| 6–7 | Fluxo de compra atual e proposto (Stripe Test Mode) | [checkout-stripe.md](checkout-stripe.md) |
| 8–9 | Plano de endereços e de UX da sacola | [address-and-cart.md](address-and-cart.md) |
| 10 | Backlog | [backlog.md](backlog.md) |
| 11 | Plano de execução | [implementation-plan.md](implementation-plan.md) |
| 12 | Plano e relatório de testes | [testing-plan.md](testing-plan.md) |
| 13 | Plano de LGPD | [privacy-lgpd.md §5–6](privacy-lgpd.md) · rascunho em [../legal/politica-de-privacidade.md](../legal/politica-de-privacidade.md) |
| 14 | Bloqueios | abaixo |
| 15 | Critérios de liberação | abaixo |

## Bloqueios

| ID | O que falta | Quem fornece | Desbloqueia |
|---|---|---|---|
| B-01 | Razão social, CNPJ, endereço, canal de privacidade/encarregado | Negócio | LGPD-01, 06, 08, 09, 10 |
| B-02 | Prazo de guarda de pedidos e logs após exclusão de conta | Jurídico/contábil | LGPD-02 |
| B-03 | Provedores de hospedagem, logs, monitoramento e e-mail (e país) | Negócio/infra | LGPD-07, OBS-01, SEC-05 |
| B-04 | Política de troca, devolução, frete e cancelamento | Negócio | LGPD-09 |
| B-05 | Conta Stripe **em modo de teste**: `sk_test_…`, `pk_test_…`, `whsec_…`; métodos habilitados (cartão / Pix / boleto) e se CPF será exigido | Negócio | PAY-02…09, QA-02 |
| B-06 | Provedor de e-mail transacional | Negócio/infra | SEC-04 |

## Critérios de liberação para uso real

Nenhum destes está atendido ainda; o app **não está pronto para uso real**.

1. Pagamento integrado e validado em Test Mode com todos os cenários de `checkout-stripe.md §5`; `paid` só por webhook verificado; reserva de estoque com expiração. A troca para chaves `live` é uma decisão separada, fora deste trabalho.
2. Exclusão de conta no app, política de privacidade e termos publicados e acessíveis, canal do titular funcionando.
3. CI obrigatório (typecheck, lint, testes, audit) e build de release com `https://`.
4. Logs com destino e retenção definidos; monitoramento de erros avaliado quanto à LGPD.
5. Rate limit compatível com a topologia de produção (proxy confiável e store compartilhado se houver mais de uma instância).
6. E2E dos fluxos de compra e endereço executado em aparelho real Android e iOS, em build de release.
7. Rotina agendada de `pnpm db:cleanup`; backups do banco com restauração testada.
