---
name: expo-react-native-development
description: Como desenvolver no app Expo (SDK 57, RN 0.86, React 19, Expo Router 57) deste projeto — estrutura por feature, dados com React Query, estado com Zustand, cliente HTTP tipado, sessão segura e instalação de dependências compatíveis. Use ao criar ou alterar telas, hooks e integrações no mobile.
---

# Desenvolvimento Expo / React Native

Convenções gerais: `docs/03-convencoes.md`. Visual: skill `mobile-ui-ux-design-system`. Layout: skill `responsive-mobile-layout`. Motion: skill `mobile-animations`.

## Estrutura
```
mobile/src/
  app/                    rotas (finas). Grupos: (tabs), (auth); telas empilhadas: product/[id], checkout/*, orders/*, addresses/*
  features/<feature>/     api.ts (chamadas tipadas) · hooks.ts (React Query) · components/ · store.ts (Zustand, se houver)
  ui/                     theme/ (tokens, ThemeProvider, useStyles) · components/ (design system)
  lib/                    api/client.ts · api/types.ts · env.ts · format.ts · query-client.ts · query-keys.ts
```

## Procedimento para uma nova tela
1. Confirme o endpoint e o tipo em `src/lib/api/types.ts` (espelha `server/src/modules/*/schemas.ts`).
2. Função de API em `features/<x>/api.ts` usando `apiClient` (nunca `fetch`/axios direto).
3. Hook em `features/<x>/hooks.ts` com query key de `src/lib/query-keys.ts`. Dados do usuário: key inclui `userId`.
4. Tela em `src/app/...` usando `<Screen>`, componentes de `src/ui` e os quatro estados (`LoadingState`, `ErrorState` com retry, `EmptyState`, conteúdo revelado com `Reveal`).
5. Mutação: `useMutation` + `invalidateQueries` das chaves afetadas + feedback (`toast`) + tratamento de `ApiError` por `code`.
6. Teste do componente/hook relevante em `__tests__`.

## Dependências
- Sempre `npx expo install <pkg>` (resolve a versão do SDK). Verifique se o módulo nativo está no Expo Go SDK 57; se não estiver, exige dev build — discuta com o `software-architect` antes.
- Proibido: NativeWind/Tailwind (removido), AsyncStorage para tokens, bibliotecas de UI completas.

## Rede local
- `src/lib/env.ts` resolve a URL: `EXPO_PUBLIC_API_URL` → host do Metro (`Constants.expoConfig.hostUri`) → `10.0.2.2` (emulador Android). Nunca `localhost` no dispositivo.

## Erros comuns
- `useEffect` para derivar estado (use `useMemo` ou derive no render).
- Query key sem parâmetros (cache misturando busca/usuários).
- Navegar antes de a mutação terminar; esquecer `router.replace` em fluxos que não devem permitir "voltar" (pedido concluído).
- Ler `process.env.X` fora do prefixo `EXPO_PUBLIC_` (não é embutido no bundle).

## Validação
`npm run typecheck`, `npm run lint`, `npm test` verdes; tela verificada no emulador (skill `local-emulator-validation`).
