import type { ReactNode } from 'react'
import { View, type StyleProp, type ViewStyle } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { ScreenEntrance } from '../motion/screen-entrance'
import { makeStyles, useStyles } from '../theme/theme-provider'

export interface ScreenProps {
  children: ReactNode
  /** Bordas que recebem o recuo da área segura. Abas já tratam o rodapé. */
  edges?: ('top' | 'bottom')[]
  background?: 'bg' | 'surface'
  style?: StyleProp<ViewStyle>
  testID?: string
}

/** Raiz de toda tela: fundo, área segura e coordenação da entrada (`Reveal`). */
export function Screen({ children, edges = ['top'], background = 'bg', style, testID }: ScreenProps) {
  const styles = useStyles(styleFactory)
  const insets = useSafeAreaInsets()
  return (
    <View
      testID={testID}
      style={[
        styles.root,
        background === 'surface' && styles.surface,
        {
          paddingTop: edges.includes('top') ? insets.top : 0,
          paddingBottom: edges.includes('bottom') ? insets.bottom : 0,
        },
        style,
      ]}
    >
      <ScreenEntrance>{children}</ScreenEntrance>
    </View>
  )
}

const styleFactory = makeStyles((t) => ({
  root: { flex: 1, backgroundColor: t.colors.bg },
  surface: { backgroundColor: t.colors.surface },
}))
