import { router } from 'expo-router'
import { useState } from 'react'
import { View } from 'react-native'

import { AddressOption } from '@/features/addresses/address-card'
import { AddressForm } from '@/features/addresses/address-form'
import { useAddresses } from '@/features/addresses/api'
import { CheckoutLayout, CONTENT_ENTRANCE } from '@/features/checkout/checkout-layout'
import { useCheckout } from '@/features/checkout/store'
import { Button, ErrorState, LoadingState, makeStyles, Reveal, Text, useStyles } from '@/ui'

export default function CheckoutAddressScreen() {
  const styles = useStyles(styleFactory)
  const addresses = useAddresses()
  const storedId = useCheckout((state) => state.addressId)
  const setAddress = useCheckout((state) => state.setAddress)
  const [adding, setAdding] = useState(false)

  const list = addresses.data ?? []
  // Seleção efetiva derivada no render: o escolhido, se ainda existir; senão o mais recente.
  const selectedId = list.some((address) => address.id === storedId) ? storedId : (list[0]?.id ?? null)
  const selectedExists = selectedId !== null

  const showForm = adding || (addresses.isSuccess && list.length === 0)

  return (
    <CheckoutLayout
      step={0}
      title="Onde entregamos?"
      footer={
        showForm ? undefined : (
          <Button
            title="Continuar para pagamento"
            onPress={() => {
              if (selectedId) setAddress(selectedId)
              router.push('/checkout/payment')
            }}
            disabled={!selectedExists}
            fullWidth
          />
        )
      }
    >
      {addresses.isPending ? (
        <LoadingState layout="inline" label="Carregando endereços" />
      ) : addresses.isError ? (
        <ErrorState error={addresses.error} onRetry={() => void addresses.refetch()} />
      ) : showForm ? (
        // Alternar lista e formulário é ação do usuário: cada bloco entra no máximo uma vez.
        <Reveal index={CONTENT_ENTRANCE} once="address-form" style={styles.list}>
          <Text variant="body" color="textMuted">
            {list.length === 0 ? 'Cadastre o endereço de entrega para continuar.' : 'Novo endereço de entrega'}
          </Text>
          <AddressForm
            submitLabel="Salvar e continuar"
            onCreated={(address) => {
              setAddress(address.id)
              setAdding(false)
              router.push('/checkout/payment')
            }}
          />
          {list.length > 0 ? <Button title="Cancelar" variant="ghost" size="md" onPress={() => setAdding(false)} /> : null}
        </Reveal>
      ) : (
        <Reveal index={CONTENT_ENTRANCE} once="address-list">
          <View style={styles.list} accessibilityRole="radiogroup" accessibilityLabel="Endereços de entrega">
            {list.map((address) => (
              <AddressOption
                key={address.id}
                address={address}
                selected={address.id === selectedId}
                onPress={() => setAddress(address.id)}
              />
            ))}
            <Button title="Adicionar outro endereço" icon="add" variant="secondary" size="md" onPress={() => setAdding(true)} />
          </View>
        </Reveal>
      )}
    </CheckoutLayout>
  )
}

const styleFactory = makeStyles((t) => ({
  list: { gap: t.space.sm },
}))
