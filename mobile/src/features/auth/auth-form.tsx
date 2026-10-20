import { router } from 'expo-router'
import type { ReactNode } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native'

import { AppHeader, IconButton, makeStyles, Reveal, Screen, Text, useStyles } from '@/ui'

import { safeRedirect } from './require-auth'

/** Conclui o fluxo de autenticação voltando para onde o usuário estava. */
export function finishAuth(redirect: unknown) {
  const target = safeRedirect(redirect, '')
  if (target) router.replace(target as never)
  else if (router.canGoBack()) router.back()
  else router.replace('/')
}

export function AuthLayout({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer: ReactNode }) {
  const styles = useStyles(styleFactory)
  return (
    <Screen>
      <AppHeader
        right={
          <IconButton
            icon="close"
            accessibilityLabel="Fechar"
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          />
        }
      />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Reveal index={0} style={styles.heading}>
            <Text variant="display" accessibilityRole="header">
              {title}
            </Text>
            <Text variant="body" color="textMuted">
              {subtitle}
            </Text>
          </Reveal>
          <Reveal index={1}>{children}</Reveal>
          <Reveal index={2} style={styles.footer}>
            {footer}
          </Reveal>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  )
}

const styleFactory = makeStyles((t) => ({
  flex: { flex: 1 },
  content: {
    paddingHorizontal: t.layout.gutterWide,
    paddingBottom: t.space.xxl,
    gap: t.space.xl,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  heading: { gap: t.space.xs, paddingTop: t.space.md },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', gap: t.space.xxs },
}))
