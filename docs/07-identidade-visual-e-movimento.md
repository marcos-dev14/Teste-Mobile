# 07 — Identidade visual, splash e movimento de entrada

## Marca Vesti

![Logo Vesti](../mobile/assets/brand/vesti-logo.png)

**Conceito.** O símbolo é uma fita de tecido dobrada em "V": a frente (braço esquerdo) desce, dobra na base e sobe como verso (braço direito, sobreposto). Une a inicial do nome, o tecido/vestuário e a dobra de uma embalagem. A sombra suave na dobra dá profundidade sem efeitos pesados. O nome usa **Fraunces SemiBold**, a mesma fonte dos títulos do app, em caixa baixa.

### Arquivos
| Arquivo | Uso |
|---|---|
| `mobile/assets/brand/vesti-logo.svg` / `-dark.svg` (+ `.png`) | Logo completa (símbolo + nome) para fundo claro / escuro |
| `mobile/assets/brand/vesti-symbol.svg` / `-dark.svg` | Símbolo isolado |
| `mobile/assets/brand/vesti-wordmark.svg` / `-dark.svg` | Nome isolado (em curvas, não depende de fonte instalada) |
| `mobile/assets/brand/vesti-app-icon.svg` | Ícone do app (fonte) |
| `mobile/assets/images/icon.png` | Ícone iOS/geral (1024, fundo tinta, sem transparência) |
| `mobile/assets/images/adaptive-icon.png` | Primeiro plano do ícone adaptativo Android (fundo `#1A1714` no `app.json`) |
| `mobile/assets/images/splash-icon.png` / `-dark.png` | Splash nativa (tema claro / escuro) |
| `mobile/assets/images/brand-*.png` | Camadas usadas pelo app (`Logo`, splash animada) |
| `mobile/assets/brand/metrics.json` | Geometria do lockup consumida por `src/ui/brand/brand-assets.ts` |

Todos são gerados a partir de uma única geometria por `mobile/assets/brand/build-brand.js`. As ferramentas do script ficam fora do `package.json` (instaladas numa pasta temporária e resolvidas via `NODE_PATH`):
```powershell
cd mobile
pnpm --dir "$env:TEMP\vesti-brand-tools" add @resvg/resvg-js@2.6.2 opentype.js@1.3.4
$env:NODE_PATH = "$env:TEMP\vesti-brand-tools\node_modules"; node assets/brand/build-brand.js
```
Não edite os PNGs à mão; altere o script e gere novamente.

### Paleta
| Token (`tokens.ts → brand`) | Hex | Papel |
|---|---|---|
| `ink` | `#1A1714` | Fundo do ícone; frente do símbolo em fundo claro; texto da logo |
| `cream` | `#F6F3EE` | Frente do símbolo no ícone; fundo da splash clara (= `colors.bg`) |
| `clay` | `#A84B29` | Verso do símbolo em fundo claro (= `colors.accent` claro) |
| `clayBright` | `#C8643C` | Verso do símbolo no ícone (contraste sobre tinta) |
| `clayLight` | `#E58A63` | Verso do símbolo em fundo escuro (= `colors.accent` escuro) |

### Uso
- **Fundo claro:** `vesti-logo`. **Fundo escuro:** `vesti-logo-dark`. No app, `<Logo />` escolhe pelo tema.
- **Espaço livre:** ao redor da logo, no mínimo a largura de um braço do "V" (≈ 27% da largura do símbolo).
- **Tamanho mínimo:** símbolo com 16 dp; logo completa com símbolo de 20 dp.
- **Símbolo isolado** (`variant="symbol"`) em espaços apertados ou quando o nome já aparece por perto.
- **Não:** esticar, rotacionar, trocar as cores dos braços entre si, aplicar sombras/contornos, colocar sobre fotos sem área de respiro, reescrever o nome em outra fonte.

## Splash
1. **Nativa** (`expo-splash-screen`, plugin no `app.json`): fundo `colors.bg` e símbolo de 64 dp centralizado, em claro e escuro. Fica visível até fontes e sessão local (SecureStore) estarem prontas — nada de rede. Há um limite de 4 s para fontes; depois disso o app segue com as fontes do sistema.
2. **Animada** (`src/ui/brand/animated-splash.tsx`): uma camada JS idêntica à nativa é montada **sobre o app já carregando**. Quando o símbolo é desenhado, ela esconde a nativa (troca invisível) e anima: o símbolo desliza para a esquerda enquanto o nome é revelado da esquerda para a direita; depois a camada some com leve ampliação (≈ 1,1 s no total, sem espera artificial). Se a imagem não carregar em 1 s, segue mesmo assim.
3. As entradas de tela ficam bloqueadas por um portão (`EntranceGateProvider`) até a splash começar a sair, para a primeira tela não "gastar" a entrada por baixo dela. Os dados da Home já são buscados durante a splash.

**Expo Go:** o Expo Go mostra o próprio carregador (ícone do app sobre a cor de fundo da splash) e não aplica a splash do plugin. A continuidade exata nativa → animada só é vista em build de desenvolvimento/produção (`pnpm expo run:android` ou EAS).

## Entrada de telas (sem skeleton)
O conteúdo **real** entra em grupos: sobe alguns dp e é revelado por uma máscara que avança da esquerda para a direita. Não há placeholders que imitam o layout.

| Peça | Arquivo | Papel |
|---|---|---|
| `Reveal` | `src/ui/motion/reveal.tsx` | Anima um grupo (`index` na sequência; `once` para itens de lista; `disabled` além da primeira dobra) |
| `ScreenEntrance` / `useScreenEntrance` | `src/ui/motion/screen-entrance.tsx` | Coordena a tela: ondas de escalonamento, reserva de chaves, conclusão ao perder o foco. Já incluído em `<Screen>` |
| `EntranceGateProvider` | idem | Segura as entradas enquanto a splash está na tela |
| `LoadingState` / `InlineLoader` | `src/ui/components/loading.tsx` | Indicador discreto quando ainda não há conteúdo (aparece só após 180 ms) |
| Tokens | `tokens.ts → motion.entrance`, `motion.easeOut` | 380 ms por grupo, 14 dp de subida, 8 dp de deriva, 45 ms entre grupos, teto de 8 passos |

**Técnica da máscara.** Só transforms, na UI thread: a caixa externa recorta (`overflow: hidden`) e entra deslizando da esquerda; o conteúdo interno faz a translação inversa e fica parado. O recorte é removido ao final para não cortar sombras.

**Regras do sistema**
- A entrada acontece na **montagem** da tela. Voltar a uma tela, trocar de aba, refetch, pull-to-refresh, paginação, filtros e alterações na sacola **não** reanimam.
- Itens de lista usam chave por posição (`once="product-card-3"`): ao rolar de volta, filtrar ou paginar, as células remontadas aparecem prontas. Só a primeira dobra anima (6 cards, 4 linhas da sacola, 5 pedidos).
- Conteúdo que chega da API depois do cabeçalho abre uma **nova onda**: começa sem herdar o atraso dos grupos anteriores.
- Ao perder o foco, a tela conclui o que estiver em andamento; o que montar enquanto ela está fora de foco aparece pronto.
- A barra com "Voltar" e as ações flutuantes (ex.: no detalhe do produto) **não** entram animadas: ficam visíveis e tocáveis desde o primeiro quadro. Nada bloqueia toques durante a entrada.
- **Movimento reduzido** (`useReducedMotion`; no Android, "Remover animações"): só um fade de 140 ms, sem deslocamento nem máscara. A splash troca o deslocamento por fade e sai em ~0,45 s.

**Estados assíncronos**
| Situação | Comportamento |
|---|---|
| Dados em cache | Conteúdo entra direto com `Reveal` |
| Sem dados ainda | `LoadingState` discreto; o conteúdo real entra quando chega |
| Refetch com dados | Conteúdo mantido (`keepPreviousData` / cache), sem animação |
| Valor em cálculo (preço da cotação) | `InlineLoader` no lugar do valor |
| Erro | `ErrorState` com entrada discreta e "Tentar novamente" sempre tocável |
| Vazio | `EmptyState` com texto e ação |

**Como usar numa tela nova**
```tsx
<Screen>
  <AppHeader largeTitle="Título" />            {/* título já é o grupo 0 */}
  <ScrollView>
    <Reveal index={1}>…</Reveal>
    <Reveal index={2} style={styles.card}>…</Reveal>
  </ScrollView>
</Screen>
```
Em listas: `<Reveal index={offset + index} once={`item-${index}`} disabled={index >= N}>`.

## Telas cobertas
Home, Buscar, Detalhe do produto, Sacola, Perfil, Pedidos, Detalhe do pedido, Endereços, Checkout (endereço, pagamento, revisão), Pedido confirmado, Entrar/Criar conta (título, formulário, rodapé). Favoritos e categorias não existem no app (veja docs/06). Toasts, modais de confirmação e mudanças de estado não recebem entrada.
