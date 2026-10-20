# Privacidade e LGPD — levantamento técnico

> Este documento descreve **o que o sistema faz hoje** com dados pessoais e o que falta tecnicamente. Ele não é parecer jurídico e não garante conformidade com a LGPD (Lei 13.709/2018). Bases legais, prazos de retenção e textos públicos precisam de validação do responsável pelo negócio e de assessoria jurídica.

## 1. Inventário de dados pessoais (inspecionado)

| Dado | Coletado em | Finalidade | Onde fica | Quem acessa | Compartilhado com | Retenção hoje |
|---|---|---|---|---|---|---|
| Nome | Cadastro (`sign-up`) | Identificação da conta | `users.name`; SecureStore do aparelho (perfil em cache) | O titular (`/me`); operadores do banco | — | Indefinida (não há exclusão de conta) |
| E-mail | Cadastro / login | Login, identificação | `users.email` (citext); SecureStore | Idem | — | Indefinida |
| Senha | Cadastro | Autenticação | Só hash scrypt (`users.password_hash`) | Ninguém em claro; redigida dos logs | — | Indefinida |
| Refresh token | Login | Manter sessão | Hash em `refresh_tokens`; token no SecureStore | — | — | **Era indefinida** → `pnpm db:cleanup` remove 7 dias após expirar |
| Nome do destinatário, CEP, logradouro, número, bairro, complemento, cidade, UF, país | Endereços / checkout | Entrega | `addresses`; **cópia** em `orders.shipping_address` (JSONB) | O titular; operadores | ViaCEP/BrasilAPI recebem **somente o CEP**, a partir do servidor (sem IP nem identidade do usuário) | `addresses`: até o titular excluir; cópia no pedido: indefinida |
| Histórico de compras (itens, valores, datas, método escolhido) | Checkout | Execução do contrato, histórico | `orders`, `order_items` | O titular; operadores | — | Indefinida (`ON DELETE RESTRICT` impede apagar o usuário) |
| IP, URL, user-agent, `requestId` | Toda requisição | Segurança, diagnóstico | Logs pino (stdout) | Quem acessa os logs | Depende de onde os logs forem enviados (não definido) | Não definida |
| IP do aparelho | Carregamento de imagens | Exibir catálogo | — | — | **Unsplash** (`images.unsplash.com`) recebe IP e user-agent do aparelho | Política da Unsplash |
| Sacola (ids de produto, quantidade) | Produto | Compra | AsyncStorage do aparelho | Quem usa o aparelho | — | Até logout explícito / limpeza |

**Não coletado** (verificado): CPF, telefone, data de nascimento, geolocalização, dados de cartão, contatos, câmera/microfone (permissões bloqueadas), analytics, identificadores de publicidade, cookies (app nativo; API não emite cookies).

**Dados mínimos para concluir uma compra hoje**: nome, e-mail, senha, endereço de entrega. Com Stripe entrará o **ID do cliente/PaymentIntent** (não o cartão: o PaymentSheet tokeniza no Stripe). Para **boleto** e alguns fluxos de **Pix** no Stripe Brasil, o provedor pode exigir **CPF** e e-mail do pagador — decisão pendente (B-05).

## 2. Matriz de riscos de privacidade

| ID | Risco | Prob. | Impacto | Situação | Task |
|---|---|---|---|---|---|
| P-01 | Titular não consegue excluir a conta (direito do art. 18, VI; também exigido por Apple/Google para apps com cadastro) | Alta | Alto | Aberto | LGPD-02 |
| P-02 | Titular não consegue obter cópia dos dados (art. 18, II e V) | Média | Médio | Aberto | LGPD-03 |
| P-03 | Correção limitada: não há edição de nome, e-mail ou endereço (só criar/excluir endereço) | Média | Médio | Aberto | LGPD-04 |
| P-04 | Sem política de privacidade nem canal de contato do controlador/encarregado | Alta | Alto | Rascunho criado (`docs/legal/`), não publicável | LGPD-01, LGPD-10 |
| P-05 | Retenção indefinida de tokens | — | Baixo | **Corrigido** | LGPD-05 |
| P-06 | Retenção indefinida de logs com IP | Média | Baixo | Aberto (depende da infraestrutura de produção) | SEC-05 |
| P-07 | Terceiro (Unsplash) recebe IP do usuário sem que isso seja informado | Alta | Baixo | Aberto: informar na política ou servir imagens por CDN próprio | LGPD-07 / PERF-03 |
| P-08 | Endereço completo em cópia imutável no pedido | — | Médio | Necessário para a entrega e prova da transação; prazo de guarda precisa de definição jurídica/fiscal | LGPD-02 |
| P-09 | Futuro: Stripe (EUA) receberá nome/e-mail/valor → transferência internacional | Certa (quando integrar) | Médio | Planejado | LGPD-07 |

## 3. Bases legais — hipóteses para validação jurídica

Não se assume consentimento como base padrão.

| Operação | Hipótese técnica a validar | Observação |
|---|---|---|
| Cadastro, login, sessão | Execução de contrato (art. 7º, V) | Necessária para a conta |
| Endereço e pedido | Execução de contrato (art. 7º, V) | |
| Guarda de pedidos após exclusão da conta | Cumprimento de obrigação legal (art. 7º, II) / exercício regular de direitos (art. 7º, VI) | Prazo depende de obrigações fiscais e de consumo — **validar** |
| Logs de segurança (IP) | Legítimo interesse (art. 7º, IX) | Exige avaliação de legítimo interesse documentada; Marco Civil (art. 15) trata de registros de acesso a aplicações — **validar** |
| Pagamento (Stripe) | Execução de contrato | Stripe atua como operador/controlador conforme o produto — **validar contrato** |
| Marketing | Consentimento (art. 7º, I) **se** for criado | Hoje **não existe** comunicação de marketing: não coletar opt-in sem finalidade |

A aceitação dos Termos de Uso **não** é consentimento para tratamento de dados; se houver marketing no futuro, o opt-in deve ser separado, desmarcado por padrão e revogável.

## 4. Registro das operações de tratamento (ROPA — minuta)

| Operação | Categoria de titular | Dados | Base (a validar) | Operadores/terceiros | Retenção (a definir) |
|---|---|---|---|---|---|
| Gestão de conta | Clientes | nome, e-mail, hash de senha | Contrato | Hospedagem da API e do banco (a definir) | Enquanto a conta existir |
| Entrega | Clientes / destinatários | endereço, nome do destinatário | Contrato | ViaCEP/BrasilAPI (só CEP) | Endereço: até exclusão; pedido: prazo legal |
| Vendas | Clientes | pedidos, itens, valores | Contrato / obrigação legal | Stripe (futuro) | Prazo fiscal |
| Segurança | Usuários da API | IP, user-agent, URL, requestId | Legítimo interesse | Provedor de logs (a definir) | A definir (sugestão técnica: 90 dias) |

## 5. Requisitos técnicos e tasks

| Task | Requisito | Prioridade | Depende de |
|---|---|---|---|
| LGPD-01 | Política de privacidade acessível no app (Perfil e Cadastro) e em URL pública | P1 | B-01 (dados do controlador) |
| LGPD-02 | Exclusão de conta no app: reautenticar com senha, revogar tokens, apagar endereços, anonimizar `users`, manter pedidos pelo prazo legal | P1 | B-02 (prazo de retenção) |
| LGPD-03 | Exportação dos dados (`GET /v1/me/export`, JSON) | P2 | — |
| LGPD-04 | Edição de nome e de endereços (`PATCH`) | P2 | — |
| LGPD-05 | Rotina de descarte de tokens expirados | P2 | — (**feito**) |
| LGPD-06 | Procedimento de atendimento a titulares (canal, prazo, verificação de identidade, registro) | P2 | B-01 |
| LGPD-07 | Avaliação de fornecedores: Unsplash, Stripe, hospedagem, ViaCEP/BrasilAPI, Expo | P2 | B-03 |
| LGPD-08 | Plano de resposta a incidentes (detecção, contenção, comunicação à ANPD e titulares) | P2 | B-01 |
| LGPD-09 | Termos de uso e condições de compra (troca, devolução, arrependimento de 7 dias — CDC art. 49) | P1 | B-01, B-04 |
| LGPD-10 | Contato do encarregado (DPO) ou canal equivalente | P1 | B-01 |

## 6. Informações de negócio necessárias antes de publicar documentos

1. Razão social, CNPJ e endereço do controlador.
2. Nome/canal do encarregado (art. 41) ou justificativa de dispensa aplicável ao porte (Resolução CD/ANPD nº 2/2022 — validar).
3. E-mail/canal de privacidade e prazo de resposta.
4. Prazos de retenção: pedidos, endereços na cópia do pedido, logs.
5. Provedores de hospedagem, banco, logs e e-mail (país de cada um).
6. Política de troca, devolução, frete e cancelamento.
7. Se haverá marketing (e-mail/push) — se sim, desenho do opt-in.
8. Conta Stripe: país/entidade e métodos habilitados (cartão, Pix, boleto) — define se CPF será coletado.
