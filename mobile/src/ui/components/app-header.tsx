import { router } from 'expo-router'
import type { ReactNode } from 'react'
import { View } from 'react-native'

import { makeStyles, useStyles } from '../theme/theme-provider'
import { IconButton } from './icon-button'
import { Text } from './text'

export interface AppHeaderProps {
  title?: string
  /** Título grande em Fraunces abaixo da barra (telas raiz). */
  largeTitle?: string
  subtitle?: string
  back?: boolean
  /** Rota usada quando não há histórico para voltar (ex.: deep link). */
  fallbackHref?: Parameters<typeof router.replace>[0]
  right?: ReactNode
}

export function AppHeader({ title, largeTitle, subtitle, back, fallbackHref = '/', right }: AppHeaderProps) {
  const styles = useStyles(styleFactory)
  const goBack = () => (router.canGoBack() ? router.back() : router.replace(fallbackHref))

  return (
    <View style={styles.container}>
      {back || title || right ? (
        <View style={styles.bar}>
          <View style={styles.side}>
            {back ? <IconButton icon="chevron-back" accessibilityLabel="Voltar" onPress={goBack} /> : null}
          </View>
          {title ? (
            <Text variant="headline" numberOfLines={1} style={styles.title} accessibilityRole="header">
              {title}
            </Text>
          ) : (
            <View style={styles.title} />
          )}
          <View style={[styles.side, styles.right]}>{right}</View>
        </View>
      ) : null}
      {largeTitle ? (
        <View style={styles.large}>
          <Text variant="display" accessibilityRole="header">
            {largeTitle}
          </Text>
          {subtitle ? (
            <Text variant="body" color="textMuted">
              {subtitle}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  )
}

const styleFactory = makeStyles((t) => ({
  container: { paddingHorizontal: t.space.xs },
  bar: { minHeight: 52, flexDirection: 'row', alignItems: 'center' },
  side: { minWidth: t.layout.minTouch, flexDirection: 'row' },
  right: { justifyContent: 'flex-end' },
  title: { flex: 1, textAlign: 'center' },
  large: { paddingHorizontal: t.space.xs, paddingTop: t.space.xs, paddingBottom: t.space.md, gap: t.space.xxs },
}))

/** Título de tela para uso dentro de conteúdo que já aplica a margem lateral (listas, formulários). */
export function ScreenTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  const styles = useStyles(titleStyleFactory)
  return (
    <View style={styles.container}>
      <Text variant="display" accessibilityRole="header">
        {title}
      </Text>
      {subtitle ? (
        <Text variant="body" color="textMuted">
          {subtitle}
        </Text>
      ) : null}
    </View>
  )
}

const titleStyleFactory = makeStyles((t) => ({
  container: { paddingTop: t.space.xs, paddingBottom: t.space.md, gap: t.space.xxs },
}))
