import type { ReactNode } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { RequireAuth } from '@/features/auth/require-auth'
import { AppHeader, makeStyles, Reveal, ScreenTitle, Screen, useStyles } from '@/ui'

import { CheckoutSteps } from './checkout-steps'

/** Posição de entrada do primeiro bloco de conteúdo das etapas (depois do progresso e do título). */
export const CONTENT_ENTRANCE = 2

/** Estrutura comum das etapas: cabeçalho, progresso, conteúdo rolável e ação fixa no rodapé. */
export function CheckoutLayout({ step, title, children, footer }: { step: 0 | 1 | 2; title: string; children: ReactNode; footer?: ReactNode }) {
  const styles = useStyles(styleFactory)
  const insets = useSafeAreaInsets()
  return (
    <RequireAuth>
      <Screen>
        <AppHeader back title="Checkout" fallbackHref="/cart" />
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <Reveal index={0}>
              <CheckoutSteps current={step} />
            </Reveal>
            <ScreenTitle title={title} entranceIndex={1} />
            {children}
          </ScrollView>
          {footer ? (
            <Reveal index={CONTENT_ENTRANCE + 3} style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
              {footer}
            </Reveal>
          ) : null}
        </KeyboardAvoidingView>
      </Screen>
    </RequireAuth>
  )
}

const styleFactory = makeStyles((t) => ({
  flex: { flex: 1 },
  content: {
    paddingHorizontal: t.layout.gutter,
    paddingBottom: t.space.xxl,
    gap: t.space.md,
    width: '100%',
    maxWidth: t.layout.maxContentWidth,
    alignSelf: 'center',
  },
  footer: {
    paddingHorizontal: t.layout.gutter,
    paddingTop: t.space.sm,
    borderTopWidth: 1,
    borderTopColor: t.colors.border,
    backgroundColor: t.colors.bg,
  },
}))
