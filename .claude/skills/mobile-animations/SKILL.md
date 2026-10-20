---
name: mobile-animations
description: Padrões de animação, gestos e microinterações com Reanimated 4 (react-native-worklets) e expo-haptics neste app — quando animar, como manter 60 fps e como respeitar movimento reduzido. Use ao adicionar ou revisar qualquer animação no mobile.
---

# Animações e microinterações

Tokens de movimento em `mobile/src/ui/theme/tokens.ts` (`motion.duration.*`, `motion.spring.*`). Primitivas em `mobile/src/ui/components/pressable-scale.tsx`, `toast.tsx`, `loading.tsx` e o sistema de entrada em `mobile/src/ui/motion/` (`Reveal`, `ScreenEntrance`). Guia completo: `docs/07-identidade-visual-e-movimento.md`.

## Quando animar
| Situação | Animação | Por quê |
|---|---|---|
| Toque em card/botão | escala 0.97 + opacidade | confirma o toque antes da navegação |
| Item adicionado ao carrinho | bounce do badge + haptic leve + toast | liga causa (botão) ao efeito (carrinho) |
| Entrada de tela / conteúdo que chegou | `Reveal`: sobe 14 dp + máscara esquerda→direita, em grupos (45 ms) | constrói a interface com o conteúdo real |
| Carregando sem conteúdo | `LoadingState` (spinner discreto após 180 ms) — **nunca skeleton** | não simula dados que ainda não existem |
| Seleção de cor/variação | crossfade de imagem (expo-image `transition`) | mostra que a imagem mudou por causa da escolha |
| Pedido concluído | entrada em escala do selo de sucesso | encerra o fluxo com clareza |

Não animar: scroll, troca de abas, textos de preço, erros de validação (aparecem imediatamente).

## Regras técnicas
- Só `transform`/`opacity`, via `useAnimatedStyle`. Nada de `setState` por frame.
- `withTiming(…, { duration: motion.duration.base })` para mudanças de estado; `withSpring(…, motion.spring.snappy)` para resposta a toque.
- `useReducedMotion()` (Reanimated): se verdadeiro, use valores finais diretamente (`ReduceMotion.System` nas animações de layout).
- Entradas só com `Reveal` (não use `entering` para isso): em `FlatList`, `once` por posição + `disabled` além da primeira dobra, para células recicladas não reanimarem.
- Haptics: `Haptics.impactAsync(Light)` em adicionar ao carrinho; `notificationAsync(Success)` em pedido criado. Envolva em `try/catch` silencioso (emuladores podem não suportar).

## Erros comuns
- Animar `height` para expandir conteúdo (causa layout a cada frame).
- `entering` em itens de lista que reciclam (reanima ao rolar).
- Durações longas (> 400 ms) em feedback de toque.

## Validação
Perf Monitor no emulador durante a interação (≥ 55 fps UI/JS); testar com "Remover animações" ativado nas opções de acessibilidade do Android.
