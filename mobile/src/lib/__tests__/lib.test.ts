import { contrastRatio, readableOn } from '@/ui/theme/contrast'
import { darkColors, lightColors, type ColorTokens } from '@/ui/theme/tokens'

import { resolveApiUrl } from '../env'
import { formatCountdown, formatMoney, maskZipCode, pluralize } from '../format'

describe('formatMoney', () => {
  it('formata centavos em reais', () => {
    expect(formatMoney(2999)).toBe('R$ 29,99')
    expect(formatMoney(0)).toBe('R$ 0,00')
    expect(formatMoney(123456)).toBe('R$ 1.234,56')
  })
})

describe('utilitários de texto', () => {
  it('pluraliza', () => {
    expect(pluralize(1, 'item', 'itens')).toBe('1 item')
    expect(pluralize(3, 'item', 'itens')).toBe('3 itens')
  })

  it('aplica máscara de CEP', () => {
    expect(maskZipCode('01310100')).toBe('01310-100')
    expect(maskZipCode('0131')).toBe('0131')
    expect(maskZipCode('01310-100999abc')).toBe('01310-100')
  })

  it('formata a contagem regressiva', () => {
    expect(formatCountdown(30 * 60_000)).toBe('30:00')
    expect(formatCountdown(59_001)).toBe('01:00')
    expect(formatCountdown(5_000)).toBe('00:05')
    expect(formatCountdown(3_723_000)).toBe('1:02:03')
    expect(formatCountdown(-1)).toBe('00:00')
  })
})

describe('resolveApiUrl', () => {
  it('prioriza a variável explícita', () => {
    expect(resolveApiUrl({ explicit: 'http://api.local:9/', hostUri: '192.168.0.5:8081', platform: 'android' })).toBe('http://api.local:9')
  })

  it('usa o IP do Metro quando disponível', () => {
    expect(resolveApiUrl({ hostUri: '192.168.0.5:8081', platform: 'android' })).toBe('http://192.168.0.5:3333')
  })

  it('no emulador Android sem IP de LAN usa 10.0.2.2 (localhost seria o próprio emulador)', () => {
    expect(resolveApiUrl({ hostUri: 'localhost:8081', platform: 'android' })).toBe('http://10.0.2.2:3333')
    expect(resolveApiUrl({ hostUri: null, platform: 'ios' })).toBe('http://127.0.0.1:3333')
  })
})

describe('contraste dos tokens (WCAG AA)', () => {
  const textPairs: [keyof ColorTokens, keyof ColorTokens][] = [
    ['text', 'bg'],
    ['text', 'surface'],
    ['textMuted', 'bg'],
    ['textMuted', 'surface'],
    ['textMuted', 'surfaceMuted'],
    ['onPrimary', 'primary'],
    ['accent', 'surface'],
    ['accent', 'accentSoft'],
    ['onAccent', 'accent'],
    ['danger', 'dangerSoft'],
    ['success', 'successSoft'],
    ['warning', 'warningSoft'],
    ['danger', 'surface'],
  ]

  it.each([
    ['claro', lightColors],
    ['escuro', darkColors],
  ])('tema %s: texto ≥ 4.5:1', (_name, colors) => {
    for (const [fg, bg] of textPairs) {
      const ratio = contrastRatio(colors[fg], colors[bg])
      expect({ pair: `${fg}/${bg}`, ok: ratio >= 4.5 }).toEqual({ pair: `${fg}/${bg}`, ok: true })
    }
  })

  it('escolhe texto legível sobre cores de produto', () => {
    expect(readableOn('#F2F2EF')).toBe('#1A1714')
    expect(readableOn('#1C1C1C')).toBe('#FFFFFF')
  })
})
