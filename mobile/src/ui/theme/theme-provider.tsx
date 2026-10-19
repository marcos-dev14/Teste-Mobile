import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { StyleSheet, useColorScheme } from 'react-native'

import {
  darkColors,
  elevation,
  fonts,
  layout,
  lightColors,
  motion,
  radius,
  space,
  typography,
  type ColorTokens,
} from './tokens'

export interface Theme {
  scheme: 'light' | 'dark'
  colors: ColorTokens
  fonts: typeof fonts
  typography: typeof typography
  space: typeof space
  radius: typeof radius
  layout: typeof layout
  motion: typeof motion
  elevation: typeof elevation
}

const base = { fonts, typography, space, radius, layout, motion, elevation }

export const lightTheme: Theme = { scheme: 'light', colors: lightColors, ...base }
export const darkTheme: Theme = { scheme: 'dark', colors: darkColors, ...base }

const ThemeContext = createContext<Theme>(lightTheme)

/** Segue a aparência do sistema. `scheme` permite forçar um tema (testes, previews). */
export function ThemeProvider({ children, scheme }: { children: ReactNode; scheme?: 'light' | 'dark' }) {
  const system = useColorScheme()
  const resolved = scheme ?? (system === 'dark' ? 'dark' : 'light')
  const theme = resolved === 'dark' ? darkTheme : lightTheme
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
}

export function useTheme(): Theme {
  return useContext(ThemeContext)
}

type NamedStyles<T> = StyleSheet.NamedStyles<T>

/**
 * Cria estilos a partir do tema, memoizados por tema.
 * A `factory` deve ser declarada no escopo do módulo (referência estável).
 */
export function useStyles<T extends NamedStyles<T>>(factory: (theme: Theme) => T): T {
  const theme = useTheme()
  return useMemo(() => StyleSheet.create(factory(theme)), [theme, factory])
}

export function makeStyles<T extends NamedStyles<T>>(factory: (theme: Theme) => T) {
  return factory
}
