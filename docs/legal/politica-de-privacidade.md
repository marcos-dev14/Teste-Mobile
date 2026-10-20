# Política de Privacidade — Vesti (RASCUNHO, NÃO PUBLICAR)

> **Status: rascunho técnico.** Redigido a partir do funcionamento real do app e da API em 2026-10-20 (ver `docs/audit/privacy-lgpd.md`). Todo trecho `[PENDENTE: …]` depende do responsável pelo negócio. O texto final precisa de revisão jurídica antes de ser publicado. Não acrescente práticas que o sistema não tenha.

Última atualização: [PENDENTE: data de publicação]

## 1. Quem somos
O aplicativo Vesti é operado por [PENDENTE: razão social], inscrita no CNPJ [PENDENTE], com sede em [PENDENTE: endereço], que atua como **controladora** dos dados pessoais descritos aqui.

Contato para assuntos de privacidade e encarregado (DPO): [PENDENTE: nome ou canal, e-mail].

## 2. Quais dados tratamos e por quê

| Dados | Quando | Para quê |
|---|---|---|
| Nome, e-mail e senha | Ao criar a conta | Identificar você e permitir o acesso. A senha é guardada apenas de forma cifrada (hash) e nunca pode ser lida por nós |
| Endereço de entrega (nome de quem recebe, CEP, rua, número, complemento, bairro, cidade, UF, país) | Ao cadastrar um endereço | Entregar seus pedidos |
| Pedidos (itens, valores, data, forma de pagamento escolhida, cópia do endereço de entrega) | Ao finalizar uma compra | Processar e registrar a compra e manter seu histórico |
| Dados técnicos (endereço IP, tipo de aparelho/navegador, data e hora de acesso) | Em cada uso | Segurança, prevenção de fraudes e abusos, diagnóstico de erros |

Não coletamos CPF, telefone, localização, contatos, fotos, nem dados de cartão. [PENDENTE: revisar quando houver integração de pagamento — ver §4.]

## 3. Bases legais
[PENDENTE — validar com assessoria jurídica. Hipóteses levantadas: execução de contrato (conta, endereço, pedidos); cumprimento de obrigação legal (guarda de registros de compra); legítimo interesse (segurança e registros de acesso).]

Não enviamos comunicações de marketing. Se isso mudar, pediremos sua autorização separadamente.

## 4. Com quem compartilhamos
- **Consulta de CEP**: ao digitar o CEP, nossos servidores consultam serviços públicos de endereço (ViaCEP e, se indisponível, BrasilAPI). Enviamos **somente o CEP** — não seu nome, IP ou conta.
- **Imagens do catálogo**: as fotos são carregadas do serviço Unsplash, que recebe o endereço IP e o tipo do seu aparelho ao exibi-las. [PENDENTE: manter este item ou passar a servir imagens por CDN próprio.]
- **Hospedagem**: [PENDENTE: provedores de servidor, banco de dados e logs, e país de cada um.]
- **Pagamentos**: [PENDENTE: quando a integração com provedor de pagamento (ex.: Stripe) for ativada, descrever os dados enviados, o papel do provedor e a transferência internacional.]
- Autoridades, quando houver obrigação legal ou ordem judicial.

## 5. Por quanto tempo guardamos
- Conta e endereços: enquanto a conta existir.
- Pedidos: [PENDENTE: prazo legal de guarda], mesmo após a exclusão da conta.
- Registros de acesso (logs): [PENDENTE: prazo].
- Sessões: os códigos de sessão expiram em até 30 dias e são apagados em até 7 dias após expirar.

## 6. Seus direitos
Você pode pedir confirmação de tratamento, acesso, correção, anonimização, portabilidade, exclusão, informação sobre compartilhamentos e revogação de consentimento, nos termos do art. 18 da LGPD, pelo canal [PENDENTE]. Responderemos em [PENDENTE: prazo].

No aplicativo hoje você já pode: ver seus dados de perfil, ver e excluir endereços e ver seus pedidos. [PENDENTE: excluir a conta, exportar e corrigir dados pelo app — em desenvolvimento.]

Você também pode reclamar à Autoridade Nacional de Proteção de Dados (ANPD).

## 7. Segurança
Senhas cifradas com algoritmo resistente a força bruta, comunicação cifrada (HTTPS) em produção, códigos de sessão guardados no armazenamento seguro do aparelho (Keychain/Keystore), limites de tentativas de login e controle de acesso para que cada conta veja apenas os próprios dados.

## 8. Dados no seu aparelho
O app guarda no aparelho: a sessão (armazenamento seguro do sistema) e os itens da sacola. Ao sair da conta, a sessão e a sacola são apagadas do aparelho.

## 9. Alterações
Avisaremos no aplicativo quando esta política mudar de forma relevante.
