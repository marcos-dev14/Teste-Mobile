# Resultados de testes — auditoria final (2026-10-21)

Ambiente: Windows 11, Node 24.14, PostgreSQL 16 (Docker), Stripe **modo de teste**. Dados sintéticos (usuários `…@example.com`, CPF de teste `000.000.000-00` ou CPF sintético com dígitos válidos).

## Suítes completas

| Projeto | Antes da auditoria | Depois | Comando |
|---|---|---|---|
| server | 136/136 | **148/148** | `pnpm test` (Vitest + Postgres real) |
| mobile | 86/86 | **96/96** | `pnpm test` (jest-expo) |
| server typecheck · lint · build | ✅ | ✅ | `pnpm typecheck`, `pnpm lint`, `pnpm build` |
| mobile typecheck · lint · `expo config` | ✅ | ✅ | |
| mobile bundle web (dev, com renderização estática) e Android | ❌ web quebrava ao importar o SDK nativo do Stripe (encontrado ao rodar `expo start` e abrir no navegador) | ✅ `npx expo export -p web --dev` e `-p android` | web sem o SDK nativo; Android com o SDK (verificado nos bundles) |
| `pnpm audit --prod` | server 0; mobile 5 (toolchain, conhecidos) | inalterado | nenhuma dependência nova nesta auditoria |

## Testes de regressão das correções (com prova por mutação)

Cada correção foi desligada temporariamente; o teste correspondente **falhou**; com a correção restaurada, **passou**.

| Correção | Teste | Sem a correção | Com a correção |
|---|---|---|---|
| A1 reembolso repetido | `payments.test.ts` "reembolso que falha não se perde…" | ❌ falhou | ✅ |
| B1 chave rechecada sob trava | `orders.test.ts` "duplicata simultânea… ÚLTIMA unidade…" | ❌ falhou | ✅ |
| B2 corrida início × cancelamento | `payments.test.ts` "cancelamento enquanto o 1º início…" | ❌ falhou | ✅ |
| B3 adiamento na rotina | `payments-async.test.ts` "…e o adia…" | ❌ falhou | ✅ |
| C1 confirmação concorrente | `payments-async.test.ts` "outra requisição confirma o Pix…" | ❌ falhou | ✅ |
| B6 navegação após desmontar | causa raiz provada à parte: callback do hook executou 1×, callback do `mutate()` 0× após desmontar | — | ✅ `audit-regressions.test.tsx` |

## Adversariais por HTTP real (requisições simultâneas, API compilada, banco de teste)

| # | Cenário | Esperado | Observado | Resultado |
|---|---|---|---|---|
| S1 | 20 envios simultâneos, mesma chave | 1 pedido | `{"200":19,"201":1}`, 1 pedido, estoque 25→24 | ✅ |
| S2 | Resposta perdida (abort em 5 ms) + retentativa | mesmo pedido | retentativa 200, 1 pedido | ✅ |
| S3 | Mesma chave, outro conteúdo | 409 | 409 `IDEMPOTENCY_KEY_REUSED` | ✅ |
| S4 | Recompra legítima (chave nova) | 2 pedidos | 201/201 | ✅ |
| S5 | 8 compradores, 1 unidade | 1 pedido, estoque 0 | `{"201":1,"409":7}`, estoque 0 | ✅ |
| S6 | Preço/total enviados pelo cliente | 400 | 400 | ✅ |
| S7 | 10 inícios de pagamento simultâneos (cartão) | 1 PaymentIntent | 10×200, 1 PI, 1 linha | ✅ |
| S8 | 5 gerações simultâneas de Pix | todas 200, 1 QR | 5×200, 1 QR (+ 3 rodadas × 10: 30×200) | ✅ |
| S9 | IDOR: ler/pagar/sincronizar/cancelar pedido alheio, excluir/usar endereço alheio | 404 | 6×404 | ✅ |
| S10 | Sem token / token adulterado | 401 | 401, 401 | ✅ |

Executados antes e depois das correções: 10/10 nas duas rodadas.

## Ponta a ponta com o Stripe real (modo de teste) e webhooks reais (`stripe listen`)

| Cenário | Esperado | Observado | Resultado |
|---|---|---|---|
| Pix pago (`succeed_immediately`), sem chamar reconciliação | `paid` pelo webhook | `paid succeeded` | ✅ |
| Pix expirado + novo QR | pendente com falha; novo QR 200 | conforme esperado | ✅ |
| Cancelar Pix logo após regerar com `expire_immediately` | cancelado ou "tente de novo" | 409 transitório (Stripe expirando o PI no mesmo instante); **nova tentativa: 200 `cancelled`** | ✅ (recuperável) |
| Boleto pago | `paid` pelo webhook | `paid` | ✅ |
| Cancelar boleto em aberto | 409 | 409 `ORDER_NOT_CANCELLABLE` | ✅ |
| Boleto vencido | `expired`, PI cancelado, estoque devolvido | `expired canceled` | ✅ |
| Cartão confirmado como o PaymentSheet (chave publicável + client secret) | `paid` pelo webhook | `paid` | ✅ |
| Webhook com assinatura forjada | 400 | 400 | ✅ |
| Estoque ao fim | pagos baixam, encerrados devolvem | consistente (após a nova tentativa do cancelamento) | ✅ |
| CPF/e-mail/chave/`whsec_`/client secret/`Bearer` nos logs | nenhum | 0 ocorrências em todos | ✅ |

## Cobertura dos cenários obrigatórios (seção 9 do pedido)

| Cenário | Coberto por |
|---|---|
| Duas finalizações simultâneas | S1, `orders.test.ts` |
| Mesma chave de idempotência | S1–S3 |
| Repetição após timeout | S2 |
| Webhook duplicado / inválido / fora de ordem | `payments.test.ts` + e2e real |
| Falha entre pagamento e persistência | reconciliação; reembolso durável (A1) |
| Manipular preço | S6, `orders.test.ts` |
| Pedido de outro usuário | S9, testes de rota |
| Falha na consulta de estoque | erro de banco → transação revertida (500 genérico); coberto por desenho, **sem teste de injeção de falha do banco** |
| Estoque insuficiente concorrente | S5 |
| Pendente / recusado / aprovado | testes de pagamento + e2e |
| Recuperação após reinício do app | `checkout-intent.test.ts`; pedidos pendentes reabertos pelo detalhe |
| Stripe indisponível | "Stripe indisponível → 503…" |
| Nova compra legítima | S4 |

## Não executado

PaymentSheet/QR/boleto renderizados em aparelho real e 3DS; carga; múltiplas instâncias; injeção de falha no banco durante o checkout; restauração de backup.
