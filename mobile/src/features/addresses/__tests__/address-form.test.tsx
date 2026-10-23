import { fireEvent, screen, waitFor } from '@testing-library/react-native'

import { api } from '@/lib/api/client'
import { ApiError } from '@/lib/api/errors'
import { renderWithProviders } from '@/test-utils'

import { AddressForm } from '../address-form'

jest.mock('@/lib/api/client', () => ({
  api: { get: jest.fn(), post: jest.fn(), delete: jest.fn() },
  setAuthBridge: jest.fn(),
}))

const get = api.get as jest.Mock
const post = api.post as jest.Mock

const PAULISTA = { zipCode: '01310-100', street: 'Avenida Paulista', neighborhood: 'Bela Vista', city: 'São Paulo', state: 'SP' }

const field = (name: string) => screen.getByTestId(`address-${name}`)
const type = (name: string, text: string) => fireEvent.changeText(field(name), text)

function renderForm() {
  const onCreated = jest.fn()
  renderWithProviders(<AddressForm onCreated={onCreated} />)
  return { onCreated }
}

beforeEach(() => {
  get.mockReset()
  post.mockReset()
})

describe('AddressForm — preenchimento por CEP', () => {
  it('consulta ao completar o CEP e preenche rua, bairro, cidade e UF', async () => {
    get.mockResolvedValue(PAULISTA)
    renderForm()

    type('zipCode', '0131010')
    expect(get).not.toHaveBeenCalled()
    type('zipCode', '01310100')

    await waitFor(() => expect(field('city').props.value).toBe('São Paulo'))
    expect(field('zipCode').props.value).toBe('01310-100')
    expect(field('addressLine1').props.value).toBe('Avenida Paulista')
    expect(field('neighborhood').props.value).toBe('Bela Vista')
    expect(field('state').props.value).toBe('SP')
    expect(get).toHaveBeenCalledTimes(1)
    expect(get.mock.calls[0]![0]).toBe('/v1/addresses/zip-codes/01310100')
    expect(screen.getByText('Endereço sugerido pelo CEP. Confira e complete.')).toBeTruthy()
  })

  it('não sobrescreve o que a pessoa já digitou', async () => {
    get.mockResolvedValue(PAULISTA)
    renderForm()

    type('addressLine1', 'Rua que eu digitei')
    type('zipCode', '01310100')

    await waitFor(() => expect(field('city').props.value).toBe('São Paulo'))
    expect(field('addressLine1').props.value).toBe('Rua que eu digitei')
  })

  it('o mesmo CEP digitado de novo usa o cache (sem nova requisição)', async () => {
    get.mockResolvedValue(PAULISTA)
    renderForm()

    type('zipCode', '01310100')
    await waitFor(() => expect(field('city').props.value).toBe('São Paulo'))
    type('zipCode', '0131010')
    type('zipCode', '01310100')
    await waitFor(() => expect(screen.getByText('Endereço sugerido pelo CEP. Confira e complete.')).toBeTruthy())
    expect(get).toHaveBeenCalledTimes(1)
  })

  it('descarta a resposta de um CEP que já foi trocado', async () => {
    let resolveFirst: (value: unknown) => void = () => {}
    get.mockImplementationOnce(() => new Promise((resolve) => (resolveFirst = resolve)))
    get.mockResolvedValueOnce({ ...PAULISTA, zipCode: '20040-002', street: 'Avenida Rio Branco', neighborhood: 'Centro', city: 'Rio de Janeiro', state: 'RJ' })
    renderForm()

    type('zipCode', '01310100')
    type('zipCode', '20040002')
    await waitFor(() => expect(field('city').props.value).toBe('Rio de Janeiro'))
    resolveFirst(PAULISTA)
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(field('city').props.value).toBe('Rio de Janeiro')
  })

  it.each([
    ['não encontrado', new ApiError('http', 404, 'ZIP_CODE_NOT_FOUND', 'CEP não encontrado.'), 'CEP não encontrado. Confira o número ou preencha o endereço.'],
    ['indisponível', new ApiError('http', 503, 'ZIP_CODE_LOOKUP_UNAVAILABLE', 'Indisponível.'), 'Não foi possível consultar o CEP agora. Preencha o endereço manualmente.'],
    ['timeout', new ApiError('timeout', 0, 'TIMEOUT', 'Tempo esgotado.'), 'Não foi possível consultar o CEP agora. Preencha o endereço manualmente.'],
  ])('CEP %s: avisa e o preenchimento manual continua possível', async (_case, error, message) => {
    get.mockRejectedValue(error)
    post.mockImplementation(async (_path: string, body: object) => ({ id: 'a1', createdAt: '2026-10-20T00:00:00.000Z', ...body }))
    const { onCreated } = renderForm()

    type('zipCode', '99999999')
    await waitFor(() => expect(screen.getByText(message)).toBeTruthy())

    type('fullName', 'Pessoa Teste')
    type('addressLine1', 'Rua Manual')
    type('number', '42')
    type('neighborhood', 'Centro')
    type('city', 'Cidade')
    type('state', 'mg')
    fireEvent.press(screen.getByTestId('address-submit'))

    await waitFor(() => expect(onCreated).toHaveBeenCalled())
    expect(post).toHaveBeenCalledWith(
      '/v1/addresses',
      expect.objectContaining({ zipCode: '99999-999', addressLine1: 'Rua Manual', number: '42', neighborhood: 'Centro', state: 'MG', addressLine2: null }),
      { auth: true },
    )
  })

  it('exige número e bairro antes de enviar', async () => {
    renderForm()
    type('fullName', 'Pessoa Teste')
    type('zipCode', '0131')
    fireEvent.press(screen.getByTestId('address-submit'))

    await waitFor(() => expect(screen.getByText('Informe o número (ou S/N).')).toBeTruthy())
    expect(screen.getByText('Informe o bairro.')).toBeTruthy()
    expect(post).not.toHaveBeenCalled()
  })
})
