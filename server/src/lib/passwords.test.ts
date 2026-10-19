import { describe, expect, it } from 'vitest'

import { getDummyHash, hashPassword, verifyPassword } from './passwords.js'

describe('passwords', () => {
  it('gera hash versionado com salt aleatório e valida a senha correta', async () => {
    const a = await hashPassword('senhaSegura1')
    const b = await hashPassword('senhaSegura1')
    expect(a).toMatch(/^scrypt\$15\$8\$1\$[\w-]+\$[\w-]+$/)
    expect(a).not.toBe(b)
    await expect(verifyPassword('senhaSegura1', a)).resolves.toBe(true)
  })

  it('rejeita senha incorreta e hashes malformados', async () => {
    const hash = await hashPassword('senhaSegura1')
    await expect(verifyPassword('senhaSegura2', hash)).resolves.toBe(false)
    await expect(verifyPassword('senhaSegura1', 'bcrypt$abc')).resolves.toBe(false)
    await expect(verifyPassword('senhaSegura1', '')).resolves.toBe(false)
  })

  it('normaliza Unicode (NFKC) antes de derivar', async () => {
    const hash = await hashPassword('ﬁrma123') // ligatura "ﬁ"
    await expect(verifyPassword('firma123', hash)).resolves.toBe(true)
  })

  it('reutiliza o mesmo hash fictício', async () => {
    expect(await getDummyHash()).toBe(await getDummyHash())
  })
})
