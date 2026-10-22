# Relatório de segurança (backend + mobile)

Referências: OWASP API Security Top 10 (2023) e OWASP MASVS v2. Classificação usada:

- **Comprovado** — verificado no código e/ou com teste executado.
- **Potencial** — depende de condição ainda não presente (ex.: deploy, múltiplas instâncias, pagamento real).
- **Preventivo** — boa prática sem falha atual.

Linha de base executada em 2026-10-20: `server` → typecheck ✅, lint ✅, **65/65 testes** ✅, `pnpm audit --prod` **0 vulnerabilidades**. `mobile` → typecheck ✅, lint ✅, **58/58 testes** ✅, `pnpm audit --prod` **5 alertas (2 high, 3 moderate)**.

## 1. Controles verificados (sem achado)

| OWASP | Controle | Evidência |
|---|---|---|
| API1 BOLA/IDOR | Todo SQL de endereço/pedido filtra `user_id = request.user.sub`; alheio → 404 | `addresses/repository.ts`, `orders/repository.ts`; `test/orders.test.ts`, `test/addresses.test.ts` |
| API2 Auth quebrada | JWT HS256 com `iss`/`aud`/`typ`, alg fixo; refresh opaco com hash, rotação, detecção de reuso; scrypt N=2^15; hash fictício contra enumeração por tempo | `plugins/auth.ts`, `auth/service.ts`, `test/security.test.ts` (alg none, secret errado, aud errado, expirado) |
| API3 Propriedade de objeto | Entradas `strict()`; respostas filtradas por schema Zod | `lib/zod-compiler.ts`, `error-handler.test.ts` |
| API4 Consumo de recursos | Rate limit global 300/min, auth 10/min, pedidos 20/min; `bodyLimit` 64 KB; `pageSize ≤ 50`; 20 linhas × 20 unidades | `plugins/security.ts`, `test/security.test.ts` |
| API6 Fluxos de negócio | Preço/estoque lidos do banco com `FOR UPDATE` em ordem de id; decremento condicional; idempotência com fingerprint | `orders/service.ts`, `test/orders.test.ts` (corrida pela última unidade) |
| API8 Má configuração | helmet (CSP `default-src 'none'`), CORS por allowlist, erro 500 genérico, `x-request-id` gerado no servidor | `plugins/security.ts`, `plugins/error-handler.ts` |
| Injeção SQL | 100% parametrizado; `ORDER BY` por whitelist; curingas do `LIKE` escapados | `products/repository.ts` |
| Segredos | `.env` ignorado e **não versionado** (`git ls-files` só lista `.env.example`); `.env.example` sem segredo real; `JWT_SECRET` de exemplo recusado em produção | `server/.gitignore`, `config/env.ts` |
| MASVS-STORAGE | Refresh token no SecureStore; access token só em memória; sacola (sem dado pessoal) no AsyncStorage | `features/auth/session-store.ts` |
| MASVS-NETWORK | Release exige `https://` | `lib/env.ts` (`assertSecureInRelease`) |
| MASVS-PLATFORM | Redirect pós-login por allowlist regex; permissões CAMERA/RECORD_AUDIO bloqueadas | `require-auth.tsx`, `app.json` |
| MASVS-CODE | Sem `console.log` no app; nenhum SDK de analytics/monitoramento (nada enviado a terceiros) | `grep` |

## 2. Achados

| ID | Classe | Sev. | Achado | Evidência | Tratamento |
|---|---|---|---|---|---|
| S-01 | Comprovado | **Alta (negócio)** | Tela final afirma "Pedido confirmado … já está em preparação" sem pagamento algum; o app é que "decide" que a compra deu certo | `app/checkout/success.tsx` | **Corrigido** (texto honesto) — PAY-01. Solução completa: Stripe (PAY-02…06) |
| S-02 | Potencial | Média | Esgotamento de estoque por pedidos não pagos (qualquer conta cria pedidos `placed` que baixam estoque para sempre) | `orders/service.ts`; achado F1 em `docs/04` | PAY-05 (reserva com prazo) + PAY-08 (limite de pedidos pendentes) |
| S-03 | Comprovado | Média | Dependência alcançável em runtime: `decode-uri-component ≤0.4.2` (DoS por URL malformada) via `expo-router > query-string` — atingível por deep link `vesti://` | `pnpm audit --prod` | SEC-02 (upgrade upstream; override já quebrou o router antes, ver `docs/04 §4`) |
| S-04 | Comprovado | Baixa | Demais alertas do mobile só no toolchain (não vão para o bundle): `node-forge` e `uuid` (@expo/cli), `braces` (metro), `sprintf-js` (jest) | caminhos do `pnpm audit --json` | Aceito; reavaliar no SDK 58 |
| S-05 | Potencial | Média | Rate limit em memória e só por IP: atrás de proxy sem `TRUST_PROXY`, todos compartilham um IP; com várias instâncias o limite multiplica; sem limite por conta no login | `plugins/security.ts` | SEC-01 |
| S-06 | Comprovado | Baixa | `/health/ready` sem rate limit executa `SELECT 1` por requisição | `health/routes.ts` | SEC-03 |
| S-07 | Comprovado | Baixa | Logs de requisição do pino registram IP e URL completa (inclui termos de busca); não há política de retenção | serializer padrão do Fastify | SEC-05 / LGPD-05 |
| S-08 | Comprovado | Baixa | Refresh tokens expirados nunca são apagados (crescimento ilimitado + retenção indefinida de dado vinculado ao usuário) | nenhum `DELETE FROM refresh_tokens` no código | **Corrigido**: comando `pnpm db:cleanup` — LGPD-05 |
| S-09 | Comprovado | Baixa | Cadastro revela e-mail existente (409) | `auth/service.ts` | Aceito anteriormente (F3); reavaliar com recuperação de senha (SEC-04) |
| S-10 | Comprovado | Baixa | Access token continua válido até 15 min após logout | desenho stateless | Aceito (F4); obrigatório revisar junto com exclusão de conta (LGPD-02) |
| S-11 | Comprovado | Info | Não existe recuperação de senha | ausência de rota | SEC-04 (depende de provedor de e-mail) |
| S-12 | Preventivo | — | Sem CI: nada impede merge com teste/lint/audit falhando | ausência de workflows | QA-04 |
| S-13 | Preventivo | — | Sem monitoramento de erros em produção | ausência de SDK | OBS-01 (exige avaliação de fornecedor/LGPD) |

**Não encontrado** (verificado): upload de arquivos (não existe), XSS (API JSON com CSP `none`; app nativo sem WebView), papéis administrativos (removidos na v2), credenciais versionadas. *(Atualizado em 2026-10-21: a API hoje faz chamadas de saída — ViaCEP/BrasilAPI com host fixo, sem redirecionamento e com limite de resposta; Stripe — e recebe webhooks com verificação de assinatura. Revisão completa em [final-security-audit.md](final-security-audit.md).)*

## 3. Novas superfícies introduzidas nesta rodada e controles

| Superfície | Risco | Controle |
|---|---|---|
| `GET /v1/addresses/zip-codes/:zipCode` (chamada de saída para ViaCEP/BrasilAPI) | SSRF, proxy aberto, abuso de cota do provedor, dado de terceiro não confiável | URL montada só com 8 dígitos validados e host fixo HTTPS; rota autenticada; rate limit 30/min; timeout 2,5 s por provedor; resposta revalidada (UF de uma lista fechada, tamanhos máximos, espaços normalizados); CEP não registrado em log |

## 4. Checklist MASVS do app

| Item | Situação |
|---|---|
| Tokens em armazenamento seguro (Keychain/Keystore) | ✅ SecureStore |
| Dados sensíveis fora de logs | ✅ sem `console.*`; sem analytics |
| Sessão expirada / logout | ✅ refresh recusado limpa sessão; logout revoga no servidor e limpa cache de queries do usuário |
| Decisões críticas no servidor | ✅ preço, estoque, posse; ⚠️ "pedido confirmado" era decisão do app → corrigido (S-01) |
| Deep links | ⚠️ esquema `vesti://` sem App Links/Universal Links verificados; redirect com allowlist; S-03 |
| Separação de ambientes | ⚠️ só `EXPO_PUBLIC_API_URL`; sem `eas.json`/perfis de build → QA-04/REL |
| Capturas de tela | ✅ não necessário hoje (sem dado de cartão no app). Com Stripe, o cartão é digitado nos campos do Stripe.js (iframes do Stripe numa WebView); o app não tem acesso ao número |
| Backup Android | ℹ️ `allowBackup` padrão: AsyncStorage (sacola) entra no backup; SecureStore é excluído pelo plugin. Aceitável |
