import { fireEvent, screen } from '@testing-library/react-native'

import { ApiError } from '@/lib/api/errors'
import { renderWithProviders } from '@/test-utils'

import { Button, ErrorState, QuantityStepper } from '../index'

describe('Button', () => {
  it('expõe papel e rótulo acessíveis e dispara onPress', () => {
    const onPress = jest.fn()
    renderWithProviders(<Button title="Adicionar à sacola" onPress={onPress} />)
    fireEvent.press(screen.getByRole('button', { name: 'Adicionar à sacola' }))
    expect(onPress).toHaveBeenCalledTimes(1)
  })

  it('não dispara quando desabilitado ou carregando', () => {
    const onPress = jest.fn()
    renderWithProviders(
      <>
        <Button title="Desabilitado" onPress={onPress} disabled />
        <Button title="Carregando" onPress={onPress} loading />
      </>,
    )
    fireEvent.press(screen.getByRole('button', { name: 'Desabilitado' }))
    fireEvent.press(screen.getByRole('button', { name: 'Carregando' }))
    expect(onPress).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Carregando' })).toHaveProp('accessibilityState', { disabled: true, busy: true })
  })
})

describe('QuantityStepper', () => {
  it('respeita limites e oferece ações de acessibilidade', () => {
    const onChange = jest.fn()
    renderWithProviders(<QuantityStepper value={3} max={3} onChange={onChange} label="Quantidade" />)
    const stepper = screen.getByRole('adjustable', { name: 'Quantidade' })
    expect(stepper).toHaveProp('accessibilityValue', { min: 1, max: 3, now: 3, text: '3' })

    fireEvent(stepper, 'accessibilityAction', { nativeEvent: { actionName: 'increment' } })
    expect(onChange).not.toHaveBeenCalled()
    fireEvent(stepper, 'accessibilityAction', { nativeEvent: { actionName: 'decrement' } })
    expect(onChange).toHaveBeenCalledWith(2)
  })

  it('no mínimo, diminuir chama onRemove', () => {
    const onRemove = jest.fn()
    renderWithProviders(<QuantityStepper value={1} onChange={jest.fn()} onRemove={onRemove} label="Qtd" />)
    fireEvent(screen.getByRole('adjustable'), 'accessibilityAction', { nativeEvent: { actionName: 'decrement' } })
    expect(onRemove).toHaveBeenCalled()
  })
})

describe('ErrorState', () => {
  it('mostra mensagem de falta de conexão e permite tentar novamente', () => {
    const onRetry = jest.fn()
    renderWithProviders(<ErrorState error={new ApiError('network', 0, 'NETWORK_ERROR', 'x')} onRetry={onRetry} />)
    expect(screen.getByText('Sem conexão')).toBeTruthy()
    fireEvent.press(screen.getByRole('button', { name: 'Tentar novamente' }))
    expect(onRetry).toHaveBeenCalled()
  })

  it('não expõe detalhes de erros 5xx', () => {
    renderWithProviders(<ErrorState error={new ApiError('http', 500, 'INTERNAL_ERROR', 'stack trace secreto')} />)
    expect(screen.getByText('Algo deu errado')).toBeTruthy()
    expect(screen.queryByText(/secreto/)).toBeNull()
  })
})
