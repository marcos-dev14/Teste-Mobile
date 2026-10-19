---
name: mobile-animations
description: Padrões de animação, gestos e microinterações com Reanimated 3 e expo-haptics neste app — quando animar, como manter 60 fps e como respeitar movimento reduzido. Use ao adicionar ou revisar qualquer animação no mobile.
---

# Animações e microinterações

Tokens de movimento em `mobile/src/ui/theme/tokens.ts` (`motion.duration.*`, `motion.spring.*`). Primitivas em `mobile/src/ui/components/pressable-scale.tsx`, `skeleton.tsx`, `toast.tsx`.

## Quando animar
| Situação | Animação | Por quê |
|---|---|---|
| Toque em card/botão | escala 0.97 + opacidade | confirma o toque antes da navegação |
| Item adicionado ao carrinho | bounce do badge + haptic leve + toast | liga causa (botão) ao efeito (carrinho) |
| Lista carregada | fade + translateY 8 escalonado (máx. 6 itens) | orienta a leitura sem atrasar conteúdo |
| Carregando | shimmer de opacidade no skeleton | indica progresso sem layout shift |
| Seleção de cor/variação | crossfade de imagem (expo-image `transition`) | mostra que a imagem mudou por causa da escolha |
| Pedido concluído | entrada em escala do selo de sucesso | encerra o fluxo com clareza |

Não animar: scroll, troca de abas, textos de preço, erros de validação (aparecem imediatamente).

## Regras técnicas
- Só `transform`/`opacity`, via `useAnimatedStyle`. Nada de `setState` por frame.
- `withTiming(…, { duration: motion.duration.base })` para mudanças de estado; `withSpring(…, motion.spring.snappy)` para resposta a toque.
- `useReducedMotion()` (Reanimated): se verdadeiro, use valores finais diretamente (`ReduceMotion.System` nas animações de layout).
- Animações de entrada (`FadeInDown`) apenas em montagem inicial; em `FlatList`, limite por índice.
- Haptics: `Haptics.impactAsync(Light)` em adicionar ao carrinho; `notificationAsync(Success)` em pedido criado. Envolva em `try/catch` silencioso (emuladores podem não suportar).

## Erros comuns
- Animar `height` para expandir conteúdo (causa layout a cada frame).
- `entering` em itens de lista que reciclam (reanima ao rolar).
- Durações longas (> 400 ms) em feedback de toque.

## Validação
Perf Monitor no emulador durante a interação (≥ 55 fps UI/JS); testar com "Remover animações" ativado nas opções de acessibilidade do Android.
