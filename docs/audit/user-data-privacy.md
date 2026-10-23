# Proteção dos dados do usuário e LGPD — auditoria final

Inventário detalhado e matriz de riscos: [privacy-lgpd.md](privacy-lgpd.md) (atualizado nesta auditoria). Este documento registra o que foi verificado agora e o que continua pendente.

> Ter uma política de privacidade não torna o sistema conforme à LGPD. As pendências abaixo dependem de decisões do negócio e de validação jurídica.

## Verificado

| Item | Situação | Evidência |
|---|---|---|
| Dados coletados | Nome, e-mail, senha (hash scrypt), endereços, pedidos; **CPF/CNPJ só para Pix/boleto, não armazenado**; IP em logs | código + `privacy-lgpd.md §1` |
| Coleta excessiva | Não encontrada. Telefone, nascimento, localização e cartão não são coletados; Stripe recebe só o `order_id` nos metadados | `gateway.ts` |
| Terceiros | Stripe (EUA; pagamento — inclusive **IP/aparelho** do usuário pelo SDK do Stripe e ao carregar QR Code/boleto hospedados), ViaCEP/BrasilAPI (só CEP, pelo servidor), Unsplash (IP ao carregar imagens) | código |
| Dados sensíveis em logs | Redigidos: senha, refresh token, `Authorization`, `taxId`; CEP mascarado na URL; mensagens do Stripe mascaradas (CPF/e-mail); **detalhes de erro do Postgres removidos (C2)**. Execuções reais: 0 ocorrências de CPF, e-mail, chaves, client secret ou token | `app.ts`, `gateway.ts`; varredura dos logs em `test-results.md` |
| No aparelho | Refresh token no SecureStore; access token só em memória; CPF só em memória e **apagado ao sair do checkout (C7)**; sacola e chave de idempotência (sem dados pessoais) no AsyncStorage | `session-store.ts`, `checkout/store.ts` |
| Analytics/monitoramento | Nenhum SDK de analytics ou crash reporting | `package.json` |
| Tráfego | Build de release exige `https://`; chamadas de saída do servidor em HTTPS com host fixo | `lib/env.ts`, `zip-code.ts` |
| Acesso por necessidade | Cada usuário só acessa os próprios dados (testado); não há papel administrativo | adversarial S9 |
| Retenção | Sessões expiradas descartadas 7 dias após vencer — **agora agendado** (manutenção de hora em hora + `pnpm jobs:run`); demais prazos indefinidos | `jobs/maintenance.ts` |

## Pendências (dependem de decisão humana)

| ID | Pendência | Bloqueio |
|---|---|---|
| LGPD-02 (P1) | Exclusão de conta (direito do titular; exigida por Apple/Google). Hoje impossível (`orders.user_id ON DELETE RESTRICT`). Proposta técnica pronta: anonimizar o usuário, revogar sessões, apagar endereços, manter pedidos pelo prazo legal | Prazo de guarda de pedidos (B-02) |
| LGPD-03 | Exportação dos dados do titular | — (implementável) |
| LGPD-04 | Edição de perfil e de endereço | — (implementável) |
| LGPD-01/09/10 | Política de privacidade, termos e canal do encarregado publicados | Dados do controlador (B-01) |
| LGPD-07 | Avaliação de fornecedores e transferência internacional (Stripe, hospedagem) | Contratos (B-03) |
| SEC-05 | Destino e retenção dos logs (IP) | Infraestrutura de produção |
| LGPD-08 | Plano de resposta a incidentes | B-01 |

## Corrigido nesta auditoria

C2 (dados da linha do Postgres em logs), C7 (CPF em memória após o checkout), C9 (documentos divergentes do código: `privacy-lgpd.md`, `security.md` e o rascunho da política foram corrigidos), retenção de sessões agora agendada (B3).
