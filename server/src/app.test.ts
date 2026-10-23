import { describe, expect, it } from 'vitest'

import { serializeError } from './app.js'

describe('serializeError', () => {
  it('não leva para o log os campos do Postgres com dados da linha', () => {
    const error = Object.assign(new Error('violates check constraint'), {
      code: '23514',
      detail: 'Failing row contains (Ana Silva, ana@example.com, Rua X 10)',
      where: 'SQL statement',
      parameters: ['ana@example.com'],
    })
    const logged = JSON.stringify(serializeError(error))
    expect(logged).toContain('23514')
    expect(logged).not.toMatch(/Ana Silva|ana@example\.com|Rua X/)
  })
})
