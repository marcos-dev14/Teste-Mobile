import { describe, expect, it } from 'vitest'

import { toLikePattern } from '../modules/products/repository.js'
import { fingerprint, generateRefreshToken, hashToken } from './tokens.js'

describe('tokens', () => {
  it('gera refresh tokens de 256 bits distintos', () => {
    const a = generateRefreshToken()
    expect(Buffer.from(a, 'base64url')).toHaveLength(32)
    expect(a).not.toBe(generateRefreshToken())
    expect(hashToken(a)).toHaveLength(32)
  })

  it('fingerprint independe da ordem das chaves e ignora undefined', () => {
    expect(fingerprint({ a: 1, b: [1, { c: 2, d: 3 }] })).toBe(
      fingerprint({ b: [1, { d: 3, c: 2 }], a: 1, e: undefined }),
    )
    expect(fingerprint({ a: 1 })).not.toBe(fingerprint({ a: 2 }))
  })
})

describe('toLikePattern', () => {
  it('escapa curingas para busca literal', () => {
    expect(toLikePattern('100%_off\\')).toBe('%100\\%\\_off\\\\%')
  })
})
