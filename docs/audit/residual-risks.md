# Riscos residuais e condições para produção

Situação em 2026-10-21, após as correções da auditoria final. **O sistema não está pronto para produção**; os itens abaixo são o que falta, com dono e ação.

## Riscos abertos

| ID | P | Risco | Por que continua aberto | Mitigação atual | Ação |
|---|---|---|---|---|---|
| RR-01 | P1 | Sem exclusão/exportação de conta | Depende do prazo legal de guarda de pedidos (B-02) | — | Decidir retenção; implementar LGPD-02/03 |
| RR-02 | P2 | 3 boletos abertos bloqueiam novas compras por até ~7 dias | Regra de negócio (B8): reduzir o limite libera esgotamento de estoque por boletos não canceláveis | Limite de 3 pendentes | Decidir: limite separado para boleto, vencimento menor, ou não reservar estoque para boleto |
| RR-03 | P2 | Telas de pagamento, 3DS e polling não testados em aparelho real | Ambiente sem dispositivo/build de release | Testes de componente; e2e da API com Stripe real | Roteiro em `testing-plan.md §4` |
| RR-04 | P3 | Duas instâncias do app (ou troca de método antes de repetir) criam 2 pedidos | Indistinguível de recompra legítima | Limite de 3 pendentes; 1 PaymentIntent por pedido (sem cobrança dupla); expiração devolve estoque | Aceitar ou criar sacola no servidor (CART-03) |
| RR-05 | P3 | Pagamento com valor divergente do pedido só gera log de erro | Exige alteração fora do sistema (Dashboard/API) | Ignorado com log; nenhuma liberação | Alertar sobre o log `payment intent does not match order` |
| RR-06 | P3 | Limites de taxa (IP e por e-mail) em memória | Uma instância hoje | Funcionam por instância | Redis ao escalar horizontalmente |
| RR-07 | P3 | Rotinas em processo duplicam em várias instâncias | Uma instância hoje | Operações idempotentes e travadas (seguras em paralelo) | Agendar `pnpm jobs:run` único e desligar o intervalo interno |
| RR-08 | P3 | Janela de 30 s sem detecção de reuso de refresh; cadastro revela e-mail; access token vale 15 min após logout | Trade-offs aceitos | Documentados em `security.md` | Reavaliar com recuperação de senha e exclusão de conta |
| RR-09 | P3 | `decode-uri-component` (via `expo-router`) com DoS por deep link | Correção depende do Expo | — | Reavaliar a cada SDK |
| RR-10 | P3 | Reembolso só total e só automático; reembolso parcial manual não muda o pedido | Fora do escopo atual | — | Política de devolução (B-04) |
| RR-11 | — | Chave secreta de teste do Stripe exposta em conversa; 8 caracteres do `JWT_SECRET` de desenvolvimento expostos em saída local | Ação humana | Ambos só de teste/desenvolvimento, nunca versionados | Gerar novas chaves |

## Dependências externas e decisões humanas

B-01 dados do controlador · B-02 prazos de retenção · B-03 provedores de produção · B-04 política de troca/devolução · ativação da conta Stripe (`charges_enabled: false`) e elegibilidade de Pix/boleto · decisão formal de trocar para chaves live (o código hoje **recusa** live em três pontos).

## Condições antes de produção

1. Exclusão de conta, política de privacidade e termos publicados.
2. Testes em aparelho real (Android e iOS, build de release), incluindo 3DS, Pix e boleto.
3. `pnpm jobs:run` agendado (a cada minuto) e `pnpm db:integrity` com alerta.
4. CI obrigatória: typecheck, lint, testes (com Postgres), `npx expo config`, **`npx expo export` para web e Android** (testes e typecheck não detectam módulo nativo importado na web), `pnpm audit`.
5. Logs com destino, retenção e acesso definidos; monitoramento de erros avaliado quanto à LGPD.
6. `TRUST_PROXY` configurado com os IPs/CIDRs do proxy real; limites de taxa compartilhados se houver mais de uma instância.
7. Teste de carga do checkout e meta de latência (ver `performance.md`).
8. Backups do banco com restauração testada.
9. Ativação da conta Stripe, webhook live com segredo em cofre, e remoção revisada das travas de modo teste.
