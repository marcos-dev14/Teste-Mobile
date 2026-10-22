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
| CPF ou CNPJ de quem paga | Ao pagar com Pix ou boleto | Exigido pelo processador de pagamento (Stripe) para gerar o Pix ou o boleto. **Não guardamos esse dado**: ele é repassado ao Stripe no momento do pagamento |

Não coletamos telefone, localização, contatos, fotos, nem dados de cartão (o cartão é digitado na tela do Stripe).

## 3. Bases legais
[PENDENTE — validar com assessoria jurídica. Hipóteses levantadas: execução de contrato (conta, endereço, pedidos); cumprimento de obrigação legal (guarda de registros de compra); legítimo interesse (segurança e registros de acesso).]

Não enviamos comunicações de marketing. Se isso mudar, pediremos sua autorização separadamente.

## 4. Com quem compartilhamos
- **Consulta de CEP**: ao digitar o CEP, nossos servidores consultam serviços públicos de endereço (ViaCEP e, se indisponível, BrasilAPI). Enviamos **somente o CEP** — não seu nome, IP ou conta.
- **Imagens do catálogo**: as fotos são carregadas do serviço Unsplash, que recebe o endereço IP e o tipo do seu aparelho ao exibi-las. [PENDENTE: manter este item ou passar a servir imagens por CDN próprio.]
- **Hospedagem**: [PENDENTE: provedores de servidor, banco de dados e logs, e país de cada um.]
- **Pagamentos**: os dados do cartão são digitados na tela segura do Stripe e enviados **diretamente** a ele; nós não os recebemos nem armazenamos. Compartilhamos com o Stripe o valor, a moeda e o identificador interno do pedido; no Pix e no boleto, também nome, e-mail e CPF/CNPJ de quem paga e, no boleto, o endereço. Guardamos apenas o identificador e a situação do pagamento. Ao abrir a tela de pagamento, o QR Code do Pix ou o boleto, o seu aparelho se conecta diretamente ao Stripe, que recebe o endereço IP e dados técnicos do aparelho. O Stripe processa dados nos Estados Unidos. [PENDENTE: base legal da transferência internacional e papel do Stripe (operador ou controlador) — validar com o jurídico.]
- Autoridades, quando houver obrigação legal ou ordem judicial.

## 5. Por quanto tempo guardamos
- Conta e endereços: enquanto a conta existir.
- Pedidos: [PENDENTE: prazo legal de guarda], mesmo após a exclusão da conta.
- Registros de acesso (logs): [PENDENTE: prazo].
- Sessões: os códigos de sessão expiram em até 30 dias e são apagados em até 7 dias após expirar (rotina automática). [PENDENTE: confirmar o agendamento no ambiente de produção.]

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
