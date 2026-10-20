---
name: mobile-ui-ux-design-system
description: Design system "Vesti" do app — tokens, tema claro/escuro, tipografia, componentes e checklist de consistência visual e UX. Use ao criar ou alterar qualquer componente visual, tela ou fluxo no mobile.
---

# Design system Vesti

Arquivos: `mobile/src/ui/theme/tokens.ts` (fonte única), `mobile/src/ui/theme/theme-provider.tsx` (`useTheme`, `useStyles`), `mobile/src/ui/components/*`.

## Identidade
- Tom: editorial, calmo, quente. Superfície `bg` off-white; `surface` branco; tinta `text` quase preta; `accent` terracota para destaque pontual; `primary` = tinta (botões principais escuros, alto contraste).
- Tipografia: `Fraunces` (display/títulos: `display`, `title`), `Inter` (corpo, rótulos, números). Escala: `display 32/38`, `title 24/30`, `headline 18/24`, `body 15/22`, `label 13/18`, `caption 12/16`.
- Espaçamento base 4 (`space[1..10]`), raios (`sm 8`, `md 12`, `lg 20`, `pill 999`), elevação discreta (sombra única `card`).

## Marca
- Logo: `<Logo />` (`src/ui/brand`), variantes `full` e `symbol`, cor pelo tema. Paleta de marca em `tokens.ts → brand`. Assets gerados por `assets/brand/build-brand.js` — guia em `docs/07-identidade-visual-e-movimento.md`.

## Procedimento
1. Procure um componente existente antes de criar um novo. Variante > novo componente.
2. Estilos via `useStyles((t) => ({...}))`; somente tokens.
3. Cubra estados: padrão, pressionado (`PressableScale`), desabilitado, carregando (`LoadingState`/`InlineLoader`, nunca skeleton), erro, foco (TextField). Agrupe o conteúdo da tela em `Reveal` na ordem de leitura.
4. Acessibilidade: `accessibilityRole`, `accessibilityLabel`/`Hint`, `accessibilityState` (`selected`, `disabled`, `busy`), tamanho de fonte dinâmico permitido (não bloquear `allowFontScaling`; limitar com `maxFontSizeMultiplier` em elementos densos).
5. Verifique contraste nos dois temas (texto ≥ 4.5:1; ícones e texto grande ≥ 3:1).

## Padrões de tela
- Cabeçalho: título em `title` (Fraunces) alinhado à esquerda; ações como `IconButton`.
- Uma ação primária por tela, fixada no rodapé seguro quando for o objetivo da tela (carrinho, checkout).
- Feedback não modal (`toast`) para ações bem-sucedidas; `Alert` apenas para confirmações destrutivas.
- Preços sempre via `<Price cents={...} />` (formato BRL do `Intl`).
- Imagens de produto com proporção fixa 4:5 (`aspectRatio`), `expo-image` com placeholder de cor da superfície.

## Erros comuns
- Cor literal (`#fff`) ou `fontSize` solto na tela.
- Botão de ícone sem rótulo acessível.
- Texto truncado sem `numberOfLines` definido em cards.
- Mistura de idiomas; textos devem estar em pt-BR.

## Validação
Revisão visual nas telas afetadas em claro e escuro, em largura 320 dp e ≥ 600 dp; `grep -rE "#[0-9A-Fa-f]{3,6}" mobile/src --include=*.tsx` não retorna cores fora de `ui/theme`.
