import { NavigationContext } from 'expo-router/react-navigation'
import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react'
import { makeMutable, useSharedValue, type SharedValue } from 'react-native-reanimated'

import { motion } from '../theme/tokens'

/**
 * Portão global das entradas: fica fechado enquanto a splash animada cobre o app,
 * para a primeira tela não "gastar" a entrada por baixo dela. Sem provider (testes,
 * telas isoladas), o portão está aberto.
 */
const EntranceGateContext = createContext(true)

export function EntranceGateProvider({ open, children }: { open: boolean; children: ReactNode }) {
  return <EntranceGateContext.Provider value={open}>{children}</EntranceGateContext.Provider>
}

export function useEntranceGate(): boolean {
  return useContext(EntranceGateContext)
}

export interface ScreenEntranceValue {
  /** 1 quando a tela perdeu o foco: seções em andamento saltam para o estado final. */
  completed: SharedValue<number>
  /**
   * Reserva a entrada de `key` para o componente `owner`. Só o primeiro dono anima;
   * remontagens (células recicladas, troca de filtro, paginação) aparecem sem animação.
   */
  claim: (key: string, owner: string) => boolean
  /** Atraso (ms) de um grupo que está começando agora, conforme sua posição `index`. */
  schedule: (index: number) => number
}

const staggerDelay = (steps: number) => Math.min(Math.max(steps, 0), motion.entrance.maxSteps) * motion.entrance.stagger

const fallback: ScreenEntranceValue = { completed: makeMutable(0), claim: () => true, schedule: staggerDelay }
const ScreenEntranceContext = createContext<ScreenEntranceValue>(fallback)

/**
 * Coordena a entrada de uma tela. Já incluído em `<Screen>`; use direto apenas fora dele.
 * A entrada acontece na montagem da tela — voltar a ela não reinicia nada.
 */
export function ScreenEntrance({ children }: { children: ReactNode }) {
  const completed = useSharedValue(0)
  const claims = useRef(new Map<string, string>())
  // Grupos que começam juntos formam uma "onda" escalonada a partir do primeiro deles. Conteúdo que
  // chega depois (resposta da API) abre uma onda nova: não herda o atraso do cabeçalho.
  const wave = useRef({ startedAt: -Infinity, baseIndex: 0 })
  const navigation = useContext(NavigationContext)

  useEffect(() => {
    if (!navigation) return
    // Ao sair da tela, conclui o que estiver em andamento; o que montar depois (dados que chegaram
    // em segundo plano) aparece pronto, sem animar fora de contexto.
    return navigation.addListener('blur', () => {
      completed.value = 1
    })
  }, [navigation, completed])

  const value = useMemo<ScreenEntranceValue>(
    () => ({
      completed,
      claim: (key, owner) => {
        const current = claims.current.get(key)
        if (current === undefined) {
          claims.current.set(key, owner)
          return true
        }
        // O mesmo dono pode perguntar de novo (renderização dupla do StrictMode).
        return current === owner
      },
      schedule: (index) => {
        const now = Date.now()
        if (now - wave.current.startedAt > motion.entrance.duration) wave.current = { startedAt: now, baseIndex: index }
        return staggerDelay(index - wave.current.baseIndex)
      },
    }),
    [completed],
  )

  return <ScreenEntranceContext.Provider value={value}>{children}</ScreenEntranceContext.Provider>
}

export function useScreenEntrance(): ScreenEntranceValue {
  return useContext(ScreenEntranceContext)
}
