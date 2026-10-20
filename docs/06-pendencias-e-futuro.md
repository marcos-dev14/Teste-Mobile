# 06 — Pendências, limitações e melhorias futuras

## Requer intervenção manual
| Item | Motivo | Ação sugerida |
|---|---|---|
| Validar splash nativa em build | O Expo Go usa o próprio carregador; a troca nativa → animada só aparece em build | `pnpm expo run:android` (ou EAS) e conferir alinhamento do símbolo em claro/escuro |
| Merge do branch `reengineering/v2` | Decisão do mantenedor | Revisar o diff e abrir PR para `main` |
| `JWT_SECRET` de produção | Segredos não são gerados pelo projeto | Gerar e guardar em cofre/variável de ambiente do provedor |
| SDK 58 | O SDK 57 foi escolhido por casar com o Expo Go instalado no iPhone; o `latest` do npm já é 58 | Quando o Expo Go das lojas passar para o 58, repetir o roteiro de upgrade (docs/05) |

## Limitações conhecidas
- **Pagamento simulado.** Nenhum dado de cartão é coletado; o método de pagamento só é registrado no pedido. Integração real exige PSP com tokenização (ex.: SDK do provedor) e webhook de confirmação para mudar o status para `paid`.
- **Frete fixo em zero**, calculado no servidor (`SHIPPING_CENTS`). Regra de frete por CEP/peso não fazia parte do escopo.
- **Status do pedido** existe no modelo (`placed → paid → shipped → delivered / cancelled`), mas só `placed` é usado; não há painel administrativo.
- **Catálogo via seed.** As rotas administrativas públicas do original (`POST /products`, `PATCH /products/:id/rating`) foram removidas por segurança; não há papel de administrador.
- **Paginação por OFFSET.** Adequada ao volume atual (catálogo e pedidos por usuário). Para catálogos grandes, migrar para paginação por cursor (keyset) usando os índices compostos já criados.
- **Imagens do Unsplash** em 900 px de largura para todos os tamanhos. Com CDN próprio, servir variantes por tamanho (card vs. detalhe).
- **Rate limit em memória e só por IP** (por instância). Com várias instâncias, usar store compartilhado (Redis); adicionar limite por conta (ex.: 5 falhas/15 min por e-mail) e documentar `TRUST_PROXY` atrás de proxy reverso.
- **Estoque reservado sem pagamento** (achado F1 da revisão de segurança): pedido `placed` baixa estoque imediatamente. Com pagamento real, implementar reserva com prazo (TTL) e devolução automática se o pagamento não confirmar, além de limite de pedidos em aberto por usuário.
- **Cadastro revela e-mail existente** (F3): aceito por UX; eliminar exige confirmação por e-mail com resposta neutra.
- **Access token válido até 15 min após logout** (F4): característica do desenho stateless; reduzir TTL ou adicionar `token_version` se o risco exigir.
- **Medição numérica de FPS** (Perf Monitor/Profiler) não registrada; a fluidez foi verificada visualmente no emulador, inclusive quadro a quadro em gravações das entradas de tela e da splash (docs/07).
- **Splash no Expo Go:** o Expo Go mostra seu carregador com o ícone do app antes da splash animada; a continuidade exata com a splash nativa só é vista em build. A splash nativa não foi validada em build neste ambiente.
- **Logo gerada por código vetorial** (`assets/brand/build-brand.js`), não por ferramenta de design/IA de imagem — não havia uma disponível no ambiente. A geometria é simples e pode ser refinada por um designer mantendo os nomes de arquivo.
- **Testes de UI ponta a ponta automatizados** (Maestro/Detox) não foram adicionados; o roteiro e2e foi executado manualmente no emulador com captura de tela (docs/05).
- **Lint do mobile** usa configuração flat própria (ESLint 9), criada quando o `eslint-config-expo` do SDK 52 exigia ESLint 8. No SDK 57 a versão oficial (`~57.0.2`) já suporta ESLint 9 e pode substituí-la.
- **Validação no iOS** não foi feita neste ambiente (Windows, sem simulador). O app foi validado no Android com o mesmo Expo Go/SDK 57.

## Funcionalidades propostas (não existiam no projeto original)
| Proposta | Valor | Esforço estimado |
|---|---|---|
| Favoritos (sincronizados por usuário) | Retenção e retorno ao produto | Médio (tabela `favorites`, 3 rotas, aba ou seção no Perfil) |
| Categorias e filtros (preço, cor) | Descoberta em catálogo maior | Médio (tabela `categories`, filtros na listagem) |
| Recuperação de senha | Requisito comum de contas | Médio (token de uso único + envio de e-mail) |
| Cancelamento de pedido pelo cliente (enquanto `placed`) | Autonomia; devolve estoque em transação | Baixo |
| Busca de endereço por CEP (ViaCEP) | Menos digitação no checkout | Baixo |
| Notificações de status do pedido | Acompanhamento | Médio (expo-notifications + jobs) |
| Monitoramento (Sentry/OpenTelemetry) | Observabilidade em produção | Baixo a médio |
