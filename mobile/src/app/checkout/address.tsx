import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import { View } from 'react-native'

import { AddressOption } from '@/features/addresses/address-card'
import { AddressForm } from '@/features/addresses/address-form'
import { useAddresses } from '@/features/addresses/api'
import { CheckoutLayout } from '@/features/checkout/checkout-layout'
import { useCheckout } from '@/features/checkout/store'
import { Button, ErrorState, makeStyles, Skeleton, Text, useStyles } from '@/ui'

export default function CheckoutAddressScreen() {
  const styles = useStyles(styleFactory)
  const addresses = useAddresses()
  const selectedId = useCheckout((state) => state.addressId)
  const setAddress = useCheckout((state) => state.setAddress)
  const [adding, setAdding] = useState(false)

  const list = addresses.data ?? []
  const selectedExists = list.some((address) => address.id === selectedId)
  const newestId = list[0]?.id

  // Seleciona o endereço mais recente se nada válido estiver escolhido.
  useEffect(() => {
    if (!selectedExists && newestId) setAddress(newestId)
  }, [selectedExists, newestId, setAddress])

  const showForm = adding || (addresses.isSuccess && list.length === 0)

  return (
    <CheckoutLayout
      step={0}
      title="Onde entregamos?"
      footer={
        showForm ? undefined : (
          <Button
            title="Continuar para pagamento"
            onPress={() => router.push('/checkout/payment')}
            disabled={!selectedExists}
            fullWidth
          />
        )
      }
    >
      {addresses.isPending ? (
        <View style={styles.list}>
          <Skeleton height={96} radius={20} />
          <Skeleton height={96} radius={20} />
        </View>
      ) : addresses.isError ? (
        <ErrorState error={addresses.error} onRetry={() => void addresses.refetch()} />
      ) : showForm ? (
        <View style={styles.list}>
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
        </View>
      ) : (
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
      )}
    </CheckoutLayout>
  )
}

const styleFactory = makeStyles((t) => ({
  list: { gap: t.space.sm },
}))
