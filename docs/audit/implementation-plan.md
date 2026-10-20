# Plano de execução por fases e agentes

Ordem ajustada às evidências: o maior risco real não é uma vulnerabilidade técnica (a base de AppSec está sólida e testada), e sim **o checkout sem pagamento** e as **lacunas de direitos do titular**. Pagamento depende de chaves de teste (B-05); por isso a Fase 4 não pôde começar e as melhorias de endereço e sacola (independentes) foram adiantadas.

| Fase | Conteúdo | Agentes | Situação |
|---|---|---|---|
| 1. Reconhecimento | Inspeção completa, linha de base de testes/audit, documentos em `docs/audit/` | Coord. | ✅ |
| 2. Segurança crítica | Nenhum P0 encontrado. P1 de segurança de negócio: PAY-01 | A3/A6 | ✅ |
| 3. Privacidade | LGPD-05 ✅; LGPD-01 rascunho; LGPD-02/09/10 aguardam B-01/B-02 | A4 | 🟡 |
| 4. Checkout + Stripe Test Mode | PAY-02…09, QA-02 | A3, A7 | ⛔ B-05 |
| 5. Endereço e sacola | ADDR-01/02/03, CART-01/02 | A1/A5 (API), A6 (app) | ✅ |
| 6. Performance e observabilidade | PERF-01, OBS-02 (independentes); OBS-01 aguarda B-03 | A5, A6 | ⬜ |
| 7. Testes finais e revisão | QA-01 (E2E), QA-04 (CI), revisão independente do diff | A7, revisor | ⬜ |

## Paralelização e posse de arquivos

- **Centralizado no coordenador** (um por vez): `server/db/migrations/*`, schemas Zod de contrato, `mobile/src/lib/api/types.ts`, `docs/02-arquitetura.md`.
- **Paralelizáveis agora**: PERF-01 (A5, só `server/scripts/`), OBS-02 (A5, novo plugin), QA-04 (A7, `.github/`), LGPD-03 (A4/A1, `modules/auth` + rota nova) e ADDR-04 (A6, depois que o contrato `PATCH` for fixado).
- **Sequenciais**: PAY-02 → (PAY-03 ∥ PAY-04 ∥ PAY-05) → PAY-06 → PAY-07/09 → QA-02. PAY-03 e PAY-04 tocam `orders/service.ts`: um agente por vez nesse arquivo.
- **LGPD-02** toca `plugins/auth.ts` (rejeitar conta excluída) — não executar em paralelo com mudanças de autenticação (SEC-01/SEC-04).

## Registro de decisões desta rodada

| Decisão | Motivo |
|---|---|
| CEP consultado **pelo backend**, não pelo app | Provedor não recebe IP/identidade do usuário; cache compartilhado; fallback e troca de provedor sem nova versão do app |
| ViaCEP primário + BrasilAPI fallback, sem geocodificação | Gratuitos, sem chave; frete fixo não precisa de coordenadas |
| `number` e `neighborhood` como colunas nuláveis + obrigatórias na API | Migration aditiva; endereços antigos seguem válidos |
| Sem atualização otimista/rollback na sacola | A sacola é local e síncrona; não existe requisição para falhar |
| Guarda de 500 ms contra toque duplo, em vez de desabilitar o botão | Não bloqueia quem quer adicionar mais unidades de propósito |
| Stripe não implementado | Sem chaves de teste não há como cumprir o DoD; especificação pronta em `checkout-stripe.md` |
