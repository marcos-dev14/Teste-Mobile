import { Fraunces_600SemiBold } from '@expo-google-fonts/fraunces'
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter'
import { QueryClientProvider } from '@tanstack/react-query'
import { useFonts } from 'expo-font'
import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider, Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { session, useSession } from '@/features/auth/session-store'
import { useSessionCleanup } from '@/features/auth/use-session-cleanup'
import { CardPaymentHost } from '@/features/payments/card-payment-sheet'
import { createQueryClient, wireQueryLifecycle } from '@/lib/query-client'
import { AnimatedSplash, ConfirmProvider, EntranceGateProvider, ThemeProvider, ToastProvider, useTheme } from '@/ui'

// A splash nativa fica até a splash animada (camada JS idêntica) estar desenhada; ela a esconde.
void SplashScreen.preventAutoHideAsync()

/** Fontes que não carregam em tempo razoável não prendem o app: segue com as fontes do sistema. */
const FONT_TIMEOUT = 4000

export default function RootLayout() {
  const [queryClient] = useState(createQueryClient)
  const [fontsLoaded, fontError] = useFonts({
    Fraunces_600SemiBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  })
  const sessionStatus = useSession((state) => state.status)
  const [fontTimedOut, setFontTimedOut] = useState(false)

  useEffect(() => {
    wireQueryLifecycle()
    void session.bootstrap()
    const timeout = setTimeout(() => setFontTimedOut(true), FONT_TIMEOUT)
    return () => clearTimeout(timeout)
  }, [])

  // Sem espera artificial nem rede: só fontes e sessão local (SecureStore). Dados da API carregam depois.
  const ready = (fontsLoaded || !!fontError || fontTimedOut) && sessionStatus !== 'loading'
  if (!ready) return null

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <QueryClientProvider client={queryClient}>
            <ToastProvider>
              <ConfirmProvider>
                <SessionEffects />
                <AppIntro>
                  <ThemedNavigation />
                </AppIntro>
                <CardPaymentHost />
              </ConfirmProvider>
            </ToastProvider>
          </QueryClientProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}

/**
 * Splash animada sobre o app já montado: a primeira tela busca dados enquanto a marca é exibida,
 * e as entradas de tela só começam quando a splash começa a sair.
 */
function AppIntro({ children }: { children: ReactNode }) {
  const [revealed, setRevealed] = useState(false)
  const [finished, setFinished] = useState(false)
  return (
    <>
      <EntranceGateProvider open={revealed}>{children}</EntranceGateProvider>
      {finished ? null : <AnimatedSplash onReveal={() => setRevealed(true)} onFinish={() => setFinished(true)} />}
    </>
  )
}

function SessionEffects() {
  useSessionCleanup()
  return null
}

function ThemedNavigation() {
  const theme = useTheme()
  const navigationTheme = useMemo(() => {
    const base = theme.scheme === 'dark' ? DarkTheme : DefaultTheme
    return {
      ...base,
      colors: {
        ...base.colors,
        background: theme.colors.bg,
        card: theme.colors.surface,
        text: theme.colors.text,
        border: theme.colors.border,
        primary: theme.colors.accent,
      },
    }
  }, [theme])

  return (
    <NavigationThemeProvider value={navigationTheme}>
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.colors.bg }, animation: 'slide_from_right' }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="sign-in" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="sign-up" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="checkout/success" options={{ gestureEnabled: false, animation: 'fade' }} />
      </Stack>
    </NavigationThemeProvider>
  )
}
