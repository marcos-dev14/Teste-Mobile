import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { Modal, Pressable, View } from 'react-native'
import Animated from 'react-native-reanimated'

import { makeStyles, useStyles } from '../theme/theme-provider'
import { backdropIn, popIn } from '../motion/presets'
import { Button } from './button'
import { Icon, type IconName } from './icon'
import { Text } from './text'

export interface ConfirmOptions {
  title: string
  message?: string
  confirmLabel: string
  cancelLabel?: string
  /** `danger`: ação destrutiva (cancelar pedido, remover, sair). */
  tone?: 'default' | 'danger'
  icon?: IconName
}

type Confirm = (options: ConfirmOptions) => Promise<boolean>

const ConfirmContext = createContext<Confirm | null>(null)

/**
 * Diálogo de confirmação no visual do app. Substitui o `Alert.alert` nativo, que muda de cara
 * entre Android e iOS e não segue o tema. Uso: `if (await confirm({...})) executar()`.
 */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const styles = useStyles(styleFactory)
  const [options, setOptions] = useState<ConfirmOptions | null>(null)
  const resolver = useRef<((value: boolean) => void) | null>(null)

  const close = useCallback((value: boolean) => {
    resolver.current?.(value)
    resolver.current = null
    setOptions(null)
  }, [])

  const confirm = useCallback<Confirm>((next) => {
    // Um diálogo por vez: o anterior, se houver, conta como "não".
    resolver.current?.(false)
    setOptions(next)
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve
    })
  }, [])

  // Desmontar com o diálogo aberto não deixa a promessa pendurada.
  useEffect(() => () => resolver.current?.(false), [])

  const danger = options?.tone === 'danger'
  const icon = options?.icon ?? (danger ? 'alert-circle-outline' : 'help-circle-outline')

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal visible={!!options} transparent animationType="none" statusBarTranslucent onRequestClose={() => close(false)}>
        {options ? (
          <View style={styles.root}>
            <Animated.View entering={backdropIn} style={styles.backdrop}>
              <Pressable
                style={styles.fill}
                onPress={() => close(false)}
                accessibilityRole="button"
                accessibilityLabel={options.cancelLabel ?? 'Cancelar'}
              />
            </Animated.View>
            <Animated.View
              entering={popIn}
              style={styles.card}
              accessibilityViewIsModal
              accessibilityRole="alert"
              testID="confirm-dialog"
            >
              <View style={[styles.iconWrap, danger ? styles.iconDanger : styles.iconDefault]}>
                <Icon name={icon} size={26} color={danger ? 'danger' : 'text'} />
              </View>
              <Text variant="title" style={styles.center}>
                {options.title}
              </Text>
              {options.message ? (
                <Text variant="body" color="textMuted" style={styles.center}>
                  {options.message}
                </Text>
              ) : null}
              <View style={styles.actions}>
                <Button
                  title={options.confirmLabel}
                  variant={danger ? 'danger' : 'primary'}
                  onPress={() => close(true)}
                  fullWidth
                  testID="confirm-dialog-confirm"
                />
                <Button
                  title={options.cancelLabel ?? 'Cancelar'}
                  variant="ghost"
                  size="md"
                  onPress={() => close(false)}
                  fullWidth
                  testID="confirm-dialog-cancel"
                />
              </View>
            </Animated.View>
          </View>
        ) : null}
      </Modal>
    </ConfirmContext.Provider>
  )
}

export function useConfirm(): Confirm {
  const context = useContext(ConfirmContext)
  if (!context) throw new Error('useConfirm deve ser usado dentro de <ConfirmProvider>')
  return context
}

const styleFactory = makeStyles((t) => ({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: t.space.xl },
  backdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: t.colors.overlay },
  fill: { flex: 1 },
  card: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    gap: t.space.sm,
    padding: t.space.xl,
    paddingBottom: t.space.md,
    borderRadius: t.radius.lg,
    backgroundColor: t.colors.surface,
    ...t.elevation.floating,
  },
  iconWrap: { width: 56, height: 56, borderRadius: t.radius.pill, alignItems: 'center', justifyContent: 'center', marginBottom: t.space.xxs },
  iconDanger: { backgroundColor: t.colors.dangerSoft },
  iconDefault: { backgroundColor: t.colors.surfaceMuted },
  center: { textAlign: 'center' },
  actions: { alignSelf: 'stretch', gap: t.space.xxs, marginTop: t.space.sm },
}))
