# Plano e relatório de testes

## 1. Resultado registrado (2026-10-20, branch `feat/audit-hardening`)

| Projeto | Comando | Antes | Depois |
|---|---|---|---|
| server | `pnpm typecheck` · `lint` · `build` | ✅ | ✅ |
| server | `pnpm test` (Vitest + Postgres real) | 65/65 | **136/136** (cartão, Pix, boleto, webhooks, CPF/CNPJ) |
| server | `pnpm audit --prod` | 0 vulnerabilidades | 0 (com `stripe` 23.0.0) |
| mobile | `pnpm typecheck` · `lint` | ✅ | ✅ |
| mobile | `pnpm test` (jest-expo) | 58/58 | **86/86** |
| mobile | `npx expo config` | — | ✅ (quebrava com o config plugin do Stripe sem opções; corrigido — incluir na CI) |
| mobile | `pnpm audit --prod` | 5 (2 high, 3 moderate) | inalterado (nenhuma dependência nova) |

Verificações manuais executadas:
- Consulta real aos provedores com CEP público (Av. Paulista): ViaCEP 432 ms a frio; fallback BrasilAPI forçado retornou o mesmo endereço; CEP `00000000` → não encontrado.
- API compilada contra o banco de desenvolvimento: sem token → 401; CEP → 200 (634 ms a frio, ~2 ms em cache); inexistente → 404 `ZIP_CODE_NOT_FOUND`; UF `XX` → 400; log de requisições mostra `/v1/addresses/zip-codes/[redacted]` (nenhuma ocorrência do CEP).
- Migration `0002` aplicada no banco de desenvolvimento; `pnpm db:cleanup` executado.

- Stripe em modo de teste, ponta a ponta pela API compilada: aprovado → `paid`; recusado → segue pendente; cancelamento → PI `canceled` e estoque devolvido; reserva vencida → cancelada pela rotina; pagar pedido já pago → 409. Nenhuma chave nem client secret apareceu no log (ver checkout-stripe §5).

**Não executado**: app no emulador/aparelho (animações, formulário e painel de cartão só foram verificados por testes de componente; precisam ser conferidos no aparelho, ver §4), 3DS, webhook com segredo real (falta a Stripe CLI), testes de carga.

## 2. Novos testes

| Arquivo | Cobre |
|---|---|
| `server/src/modules/addresses/zip-code.test.ts` | normalização, fallback por timeout sem CEP no log, inexistente, indisponível sem cache de falha, dado de terceiro malicioso/inválido, cache + agrupamento de consultas simultâneas, máscara de URL no log |
| `server/test/zip-codes.test.ts` | rota: 401, 200, hífen aceito, 400 sem consultar provedor, 404, 503 |
| `server/test/addresses.test.ts` (+3) | número/bairro obrigatórios, UF normalizada e validada, endereço legado legível |
| `server/test/orders.test.ts` (+1, 1 ajustado) | snapshot com número/bairro; pedido legado devolve `null` |
| `server/test/retention.test.ts` | descarte só de tokens expirados além da carência; sessão ativa intacta |
| `mobile/.../address-form.test.tsx` | preenchimento, não sobrescreve edição, cache sem nova requisição, resposta obsoleta descartada, 404/503/timeout com envio manual, campos obrigatórios |
| `mobile/.../add-to-cart-feedback.test.tsx` | badge e rótulo atualizados, "Na sacola", toque duplo ignorado, limite atingido sem feedback de sucesso |
| `mobile/.../order-success.test.tsx` | confirmação não afirma pagamento |

## 3. Plano (a fazer)

| Área | Cenários | Task |
|---|---|---|
| Stripe | 15 cenários de `checkout-stripe.md §5` | QA-02 |
| E2E (Maestro, emulador) | catálogo → produto → adicionar (badge) → sacola → login → endereço por CEP → revisão → pedido → histórico; CEP inexistente com preenchimento manual; modo avião durante o pedido e nova tentativa (mesmo pedido) | QA-01 |
| Isolamento | já coberto: IDOR em endereços/pedidos; repetir para exportação (LGPD-03) e exclusão (LGPD-02) | — |
| Carga | `products`, `products/:id`, `cart/quote`, `orders`, `zip-codes` (cache quente/frio) com p50/p95/p99 | PERF-01 |
| CI | typecheck, lint, test (Postgres de serviço), audit em cada PR | QA-04 |

## 4. Conferência manual pendente em aparelho (release build)
- Voo até a sacola: arco aterrissa no centro do ícone em telefone pequeno, grande e tablet; com fonte do sistema em 200%; em claro/escuro.
- Toque durante o voo (segundo item) reinicia a animação sem travar.
- "Reduzir movimento" ligado: sem voo nem bump, só badge e botão mudam.
- Teclado no formulário: foco salta para "Número" após o CEP; "Próximo" percorre na ordem visual.
- Painel de cartão (Expo Go ou build) — textos em português, tema claro/escuro, teclado não cobre o botão "Pagar": cartão `4242 4242 4242 4242` → tela "Pagamento aprovado"; `4000 0000 0000 0002` → erro e "Pagar agora" continua disponível; `4000 0025 0000 3155` → autenticação 3DS e retorno ao app; fechar a folha → "Pedido aguardando pagamento" com prazo; "Cancelar pedido" → "Pedido cancelado"; tema escuro.
- Pix: contagem regressiva visível e em destaque nos últimos 5 min; com `teste+fill_never@…`, ao zerar o QR some, aparece "O tempo para pagar acabou" e em até ~1–2 min o pedido vira "expirado" com o estoque devolvido. Diálogo "Cancelar pedido?" no visual do app (tema claro/escuro, voltar do Android fecha sem cancelar).
