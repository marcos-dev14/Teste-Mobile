import { SafeAreaView, Text } from "react-native"

import { colors } from "@/styles/theme/colors"

export function AddressCheckout() {
  return (
    <SafeAreaView style={{ flex: 1, paddingTop: 40, backgroundColor: colors.white }}>
      <Text>Tela de Endereço de Entrega</Text>
    </SafeAreaView>
  )
}