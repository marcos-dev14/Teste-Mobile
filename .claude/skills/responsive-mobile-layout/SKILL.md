---
name: responsive-mobile-layout
description: Regras de responsividade, áreas seguras e acessibilidade para telas do app (320 dp a tablets, fonte dinâmica, leitores de tela). Use ao montar ou revisar layout de qualquer tela ou componente do mobile.
---

# Layout responsivo e acessível

## Regras
1. **Áreas seguras**: toda tela usa `<Screen>` (que aplica `useSafeAreaInsets`); rodapés fixos somam `insets.bottom`. Nunca `paddingTop` fixo para status bar.
2. **Sem larguras fixas de conteúdo**: use `flex`, porcentagens ou valores calculados por `useWindowDimensions()`.
3. **Grade de produtos**: colunas = `width < 600 ? 2 : width < 900 ? 3 : 4`; largura do card = `(width - gutter*2 - gap*(cols-1)) / cols`. Imagem com `aspectRatio: 4/5`.
4. **Conteúdo máximo** em telas largas: `maxWidth: 720` centralizado para formulários e detalhes.
5. **Teclado**: formulários dentro de `KeyboardAvoidingView` (`behavior="padding"` no iOS, `height` no Android) + `ScrollView` com `keyboardShouldPersistTaps="handled"`; `returnKeyType` e foco no próximo campo.
6. **Fonte dinâmica**: não desative `allowFontScaling`; em elementos densos use `maxFontSizeMultiplier={1.3}`. Layouts devem quebrar linha, não cortar.
7. **Toque**: mínimo 44×44 dp (`hitSlop` para ícones pequenos); espaçamento ≥ 8 dp entre alvos.
8. **Leitor de tela**: rótulos em português, `accessibilityRole` correto, grupos com `accessible` quando o card é um único alvo, `accessibilityLiveRegion="polite"` para toasts/erros (Android).
9. **Contraste**: AA nos dois temas (ver skill `mobile-ui-ux-design-system`).

## Erros comuns
- `Dimensions.get` em módulo (não reage a rotação/split-screen) — use o hook.
- `height` fixo em cards com texto (corta com fonte grande).
- Ícone sem rótulo; ordem de foco diferente da visual.

## Validação
Emulador em 320×640 dp (ex.: Pixel 2 com tamanho de fonte "Maior") e em tablet/landscape; TalkBack percorrendo a tela principal e o checkout sem elementos sem rótulo.
