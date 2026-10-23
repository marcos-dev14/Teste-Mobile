import AsyncStorage from '@react-native-async-storage/async-storage'

import { idempotencyKeyFor, useCheckout } from '../store'

const STORAGE_KEY = 'vesti.checkout-intent.v1'

describe('intenção de compra persistida (anti-duplicidade após reabrir o app)', () => {
  beforeEach(async () => {
    useCheckout.getState().reset()
    await AsyncStorage.clear()
  })

  it('a mesma compra reaproveita a chave depois de "reiniciar" o app', async () => {
    const key = idempotencyKeyFor('pedido-A')
    await new Promise((resolve) => setTimeout(resolve, 0))

    // Simula o app reaberto: o disco guarda o que foi gravado; a memória começa vazia.
    const onDisk = await AsyncStorage.getItem(STORAGE_KEY)
    expect(onDisk).toContain(key)
    useCheckout.setState({ idempotency: null })
    await AsyncStorage.setItem(STORAGE_KEY, onDisk!)
    await useCheckout.persist.rehydrate()

    expect(idempotencyKeyFor('pedido-A')).toBe(key)
    expect(idempotencyKeyFor('pedido-B')).not.toBe(key)
  })

  it('o CPF/CNPJ nunca é gravado no aparelho', async () => {
    useCheckout.getState().setTaxId('529.982.247-25')
    idempotencyKeyFor('pedido-A')
    await new Promise((resolve) => setTimeout(resolve, 0))
    const stored = (await AsyncStorage.getItem(STORAGE_KEY)) ?? ''
    expect(stored).toContain('pedido-A')
    expect(stored).not.toContain('529')
  })

  it('sair do checkout apaga o CPF mas mantém a chave; concluir a compra apaga tudo', () => {
    useCheckout.getState().setTaxId('529.982.247-25')
    const key = idempotencyKeyFor('pedido-A')
    useCheckout.getState().clearTaxId()
    expect(useCheckout.getState()).toMatchObject({ taxId: '', idempotency: { key } })
    useCheckout.getState().reset()
    expect(useCheckout.getState().idempotency).toBeNull()
  })
})
