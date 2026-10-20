import { View } from 'react-native'

import { describeError } from '@/lib/api/errors'

import { Reveal } from '../motion/reveal'
import { makeStyles, useStyles } from '../theme/theme-provider'
import { Button } from './button'
import { Icon, type IconName } from './icon'
import { Text } from './text'

interface StateLayoutProps {
  icon: IconName
  title: string
  message?: string
  actionLabel?: string
  onAction?: () => void
  tone?: 'neutral' | 'danger'
  testID?: string
}

function StateLayout({ icon, title, message, actionLabel, onAction, tone = 'neutral', testID }: StateLayoutProps) {
  const styles = useStyles(styleFactory)
  // Entrada discreta (mesmo padrão das telas), sem bloquear a ação de tentar novamente.
  return (
    <Reveal containerStyle={styles.grow} style={styles.grow} testID={testID}>
      <View style={styles.container} accessibilityLiveRegion="polite">
        <View style={[styles.iconWrap, tone === 'danger' && styles.iconDanger]}>
          <Icon name={icon} size={28} color={tone === 'danger' ? 'danger' : 'textMuted'} />
        </View>
        <Text variant="title" align="center" accessibilityRole="header">
          {title}
        </Text>
        {message ? (
          <Text variant="body" color="textMuted" align="center" style={styles.message}>
            {message}
          </Text>
        ) : null}
        {actionLabel && onAction ? (
          <Button title={actionLabel} onPress={onAction} variant="secondary" size="md" style={styles.action} />
        ) : null}
      </View>
    </Reveal>
  )
}

export interface EmptyStateProps {
  icon?: IconName
  title: string
  message?: string
  actionLabel?: string
  onAction?: () => void
}

export function EmptyState({ icon = 'sparkles-outline', ...rest }: EmptyStateProps) {
  return <StateLayout icon={icon} testID="empty-state" {...rest} />
}

export interface ErrorStateProps {
  error: unknown
  onRetry?: () => void
}

export function ErrorState({ error, onRetry }: ErrorStateProps) {
  const { title, message } = describeError(error)
  return (
    <StateLayout
      icon="cloud-offline-outline"
      tone="danger"
      title={title}
      message={message}
      actionLabel={onRetry ? 'Tentar novamente' : undefined}
      onAction={onRetry}
      testID="error-state"
    />
  )
}

const styleFactory = makeStyles((t) => ({
  grow: { flexGrow: 1 },
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: t.space.xl,
    paddingVertical: t.space.xxxl,
    gap: t.space.sm,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: t.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.surfaceMuted,
    marginBottom: t.space.xs,
  },
  iconDanger: { backgroundColor: t.colors.dangerSoft },
  message: { maxWidth: 320 },
  action: { marginTop: t.space.sm },
}))
