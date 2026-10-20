import { act, fireEvent, screen } from '@testing-library/react-native'
import * as SplashScreen from 'expo-splash-screen'
import { useEffect } from 'react'
import { Text } from 'react-native'

import { renderWithProviders } from '@/test-utils'

import { AnimatedSplash, Reveal, ScreenEntrance, useScreenEntrance } from '../index'
import { motion } from '../theme/tokens'

jest.mock('expo-splash-screen', () => ({ hideAsync: jest.fn(() => Promise.resolve()), preventAutoHideAsync: jest.fn() }))

const layout = { nativeEvent: { layout: { x: 0, y: 0, width: 320, height: 40 } } }

describe('Reveal', () => {
  it('renderiza o conteúdo real desde o primeiro quadro (sem placeholder)', () => {
    renderWithProviders(
      <ScreenEntrance>
        <Reveal testID="section">
          <Text>Camiseta Básica</Text>
        </Reveal>
      </ScreenEntrance>,
    )
    expect(screen.getByText('Camiseta Básica')).toBeTruthy()
  })

  it('com a mesma chave `once`, só a primeira montagem anima', () => {
    const view = renderWithProviders(
      <ScreenEntrance>
        <Reveal once="card-0" testID="first">
          <Text>A</Text>
        </Reveal>
      </ScreenEntrance>,
    )
    // O grupo animado mede a própria largura para a máscara; o que não anima não precisa.
    expect(screen.getByTestId('first').props.onLayout).toBeInstanceOf(Function)

    // Remontagem (ex.: célula reciclada da lista) dentro da mesma tela.
    view.rerender(
      <ScreenEntrance>
        <Reveal once="card-0" testID="again" key="remount">
          <Text>A</Text>
        </Reveal>
      </ScreenEntrance>,
    )
    expect(screen.getByTestId('again').props.onLayout).toBeUndefined()
  })

  it('aceita medir e animar sem erros (máscara + subida)', () => {
    renderWithProviders(
      <ScreenEntrance>
        <Reveal index={2} testID="section">
          <Text>Conteúdo</Text>
        </Reveal>
      </ScreenEntrance>,
    )
    fireEvent(screen.getByTestId('section'), 'layout', layout)
    expect(screen.getByText('Conteúdo')).toBeTruthy()
  })
})

describe('ScreenEntrance.schedule', () => {
  function Probe({ onReady }: { onReady: (value: ReturnType<typeof useScreenEntrance>) => void }) {
    const entrance = useScreenEntrance()
    useEffect(() => {
      onReady(entrance)
    }, [entrance, onReady])
    return null
  }

  it('escalona grupos de uma mesma onda e reinicia a contagem para conteúdo que chega depois', () => {
    const now = jest.spyOn(Date, 'now').mockReturnValue(1_000)
    let entrance!: ReturnType<typeof useScreenEntrance>
    renderWithProviders(
      <ScreenEntrance>
        <Probe onReady={(value) => (entrance = value)} />
      </ScreenEntrance>,
    )
    const { stagger, maxSteps, duration } = motion.entrance

    // Cabeçalho montado com a tela: 0, 1, 2…
    expect([0, 1, 2].map(entrance.schedule)).toEqual([0, stagger, 2 * stagger])
    // Teto: telas longas não fazem o usuário esperar.
    expect(entrance.schedule(50)).toBe(maxSteps * stagger)

    // Cards que chegam da API bem depois: nova onda, começa sem herdar o atraso do cabeçalho.
    now.mockReturnValue(1_000 + duration + 500)
    expect(entrance.schedule(3)).toBe(0)
    expect(entrance.schedule(4)).toBe(stagger)
    now.mockRestore()
  })

  it('claim é idempotente para o mesmo dono e nega outros', () => {
    let entrance!: ReturnType<typeof useScreenEntrance>
    renderWithProviders(
      <ScreenEntrance>
        <Probe onReady={(value) => (entrance = value)} />
      </ScreenEntrance>,
    )
    expect(entrance.claim('k', 'a')).toBe(true)
    expect(entrance.claim('k', 'a')).toBe(true)
    expect(entrance.claim('k', 'b')).toBe(false)
  })
})

describe('AnimatedSplash', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.mocked(SplashScreen.hideAsync).mockClear()
  })
  afterEach(() => jest.useRealTimers())

  it('esconde a splash nativa quando o símbolo carrega e libera o app ao final', () => {
    const onReveal = jest.fn()
    const onFinish = jest.fn()
    renderWithProviders(<AnimatedSplash onReveal={onReveal} onFinish={onFinish} />)

    const splash = screen.getByTestId('animated-splash', { includeHiddenElements: true })
    expect(splash).toBeTruthy()

    // Primeira imagem da camada JS (o símbolo) desenhada → troca com a nativa.
    const [symbol] = screen.UNSAFE_getAllByProps({ fadeDuration: 0 })
    act(() => symbol?.props.onLoad())
    act(() => jest.advanceTimersByTime(32))
    expect(SplashScreen.hideAsync).toHaveBeenCalledTimes(1)

    act(() => jest.advanceTimersByTime(2_000))
    expect(onFinish).toHaveBeenCalledTimes(1)
  })

  it('não prende o app se a imagem nunca carregar (timeout de segurança)', () => {
    const onFinish = jest.fn()
    renderWithProviders(<AnimatedSplash onReveal={jest.fn()} onFinish={onFinish} />)
    act(() => jest.advanceTimersByTime(4_000))
    expect(SplashScreen.hideAsync).toHaveBeenCalled()
    expect(onFinish).toHaveBeenCalled()
  })
})
