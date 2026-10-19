import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { AccessibilityInfo, Pressable, View } from 'react-native'
import Animated, { FadeInDown, FadeOutDown, ReduceMotion } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { makeStyles, useStyles } from '../theme/theme-provider'
import { Icon, type IconName } from './icon'
import { Text } from './text'

type Tone = 'success' | 'error' | 'info'

interface ToastOptions {
  message: string
  tone?: Tone
  actionLabel?: string
  onAction?: () => void
  durationMs?: number
}

interface ToastState extends ToastOptions {
  id: number
}

interface ToastContextValue {
  show: (options: ToastOptions) => void
  /** Distância extra do rodapé (ex.: altura da tab bar) para o toast não cobrir a navegação. */
  setBottomOffset: (offset: number) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const ICONS: Record<Tone, IconName> = {
  success: 'checkmark-circle',
  error: 'alert-circle',
  info: 'information-circle',
}

/** Feedback não modal. Substitui os `Alert.alert` de sucesso do app original. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const styles = useStyles(styleFactory)
  const insets = useSafeAreaInsets()
  const [toast, setToast] = useState<ToastState | null>(null)
  const [bottomOffset, setBottomOffset] = useState(0)
  const timer = useRef<ReturnType<typeof setTimeout>>()
  const sequence = useRef(0)

  const show = useCallback((options: ToastOptions) => {
    clearTimeout(timer.current)
    sequence.current += 1
    setToast({ ...options, id: sequence.current })
    AccessibilityInfo.announceForAccessibility(options.message)
    timer.current = setTimeout(() => setToast(null), options.durationMs ?? 3000)
  }, [])

  const value = useMemo(() => ({ show, setBottomOffset }), [show])
  const tone = toast?.tone ?? 'info'

  return (
    <ToastContext.Provider value={value}>
      {children}
      <View pointerEvents="box-none" style={[styles.host, { bottom: insets.bottom + bottomOffset + 12 }]}>
        {toast ? (
          <Animated.View
            key={toast.id}
            entering={FadeInDown.duration(220).reduceMotion(ReduceMotion.System)}
            exiting={FadeOutDown.duration(160).reduceMotion(ReduceMotion.System)}
            style={styles.toast}
            accessibilityLiveRegion="polite"
          >
            <Icon name={ICONS[tone]} size={20} color="onPrimary" />
            <Text variant="label" color="onPrimary" style={styles.message} numberOfLines={3}>
              {toast.message}
            </Text>
            {toast.actionLabel && toast.onAction ? (
              <Pressable
                hitSlop={12}
                accessibilityRole="button"
                onPress={() => {
                  toast.onAction?.()
                  setToast(null)
                }}
              >
                <Text variant="label" color="onPrimary" style={styles.action}>
                  {toast.actionLabel}
                </Text>
              </Pressable>
            ) : null}
          </Animated.View>
        ) : null}
      </View>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast deve ser usado dentro de <ToastProvider>')
  return context
}

const styleFactory = makeStyles((t) => ({
  host: { position: 'absolute', left: t.space.md, right: t.space.md, alignItems: 'center' },
  toast: {
    width: '100%',
    maxWidth: 520,
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space.sm,
    paddingVertical: t.space.sm,
    paddingHorizontal: t.space.md,
    borderRadius: t.radius.md,
    backgroundColor: t.colors.primary,
    ...t.elevation.floating,
  },
  message: { flex: 1 },
  action: { textDecorationLine: 'underline' },
}))
