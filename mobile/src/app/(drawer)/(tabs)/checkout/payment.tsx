import { useState } from "react"
import { Platform, SafeAreaView, ScrollView, Text, View } from "react-native"
import { router } from "expo-router"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { MaterialIcons } from "@expo/vector-icons"

import { paymentFormSchema, type PaymentFormSchema } from "@/schemas/payment-form-schema"
import { formatCardNumber } from "@/utils/format-card-number"
import { formatExpirationDate } from "@/utils/format-expiration-data"
import { formatSecurityCode } from "@/utils/format-security-code"

import { Header } from "@/components/header"
import { Input } from "@/components/input"
import { Button } from "@/components/button"
import { Checkbox } from "@/components/checkbox"

import { colors } from "@/styles/theme/colors"

export default function Payment() {
  const [isChecked, setIsChecked] = useState(true)

  const {
    control,
    formState: { errors },
  } = useForm<PaymentFormSchema>({
    resolver: zodResolver(paymentFormSchema),
  })

  return (
    <SafeAreaView style={{ flex: 1, paddingTop: 40, backgroundColor: colors.white }}>
      <Header backButton linkButton="/checkout/address" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Platform.OS === "ios" ? 130 : 40 }}
      >
        <View className="w-full px-4 mt-4">
          <Text className="font-bold text-2xl text-darker">Checkout</Text>

          <Text className="font-semibold text-lg text-darker mt-4">
            Método de pagamento
          </Text>

          <Text className="font-sans text-base text-darker mt-4">
            A cobrança não será feita até que você revise sua compra na próxima tela.
          </Text>

          <View className="flex-row items-center justify-between mb-4 mt-6">
            <Text className="font-semibold text-lg text-darker">
              Cartão
            </Text>

            <MaterialIcons name="credit-card" size={32} color="#DBDBDB" />
          </View>

          <View className="w-full mt-4">
            <Controller
              control={control}
              name="fullName"
              render={({ field: { onChange, onBlur, value } }) => (
                <View className="flex-1 mb-4">
                  <Input
                    label="Nome completo *"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    error={!!errors.fullName}
                  />
  
                  {errors.fullName && (
                    <Text className="text-red text-sm mt-1">
                      {errors.fullName.message}
                    </Text>
                  )}
                </View>
              )}
            />

            <Controller
              control={control}
              name="cardNumber"
              render={({ field: { onChange, onBlur, value } }) => (
                 <View className="flex-1 mb-4">
                  <Input
                    label="Número do cartão *"
                    onBlur={onBlur}
                    keyboardType="numeric"
                    onChangeText={(text) => onChange(formatCardNumber(text))}
                    value={value}
                    error={!!errors.cardNumber}
                  />

                  {errors.cardNumber && (
                    <Text className="text-red text-sm mt-1">
                      {errors.cardNumber.message}
                    </Text>
                  )}
                </View>
              )}
            />

            <Controller
              control={control}
              name="fullNameOnCard"
              render={({ field: { onChange, onBlur, value } }) => (
                 <View className="flex-1 mb-4">
                  <Input
                    label="Nome completo no cartão *"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    error={!!errors.fullNameOnCard}
                  />

                  {errors.fullNameOnCard && (
                    <Text className="text-red text-sm mt-1">
                      {errors.fullNameOnCard.message}
                    </Text>
                  )}
                </View>
              )}
            />

            <View className="flex-row w-full justify-between gap-4">
              <Controller
                control={control}
                name="expirationDate"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View className="flex-1 mb-4">
                    <Input
                      label="Data de expiração *"
                      onBlur={onBlur}
                      keyboardType="numeric"
                      onChangeText={(text) => onChange(formatExpirationDate(text))}
                      value={value || undefined}
                      error={!!errors.expirationDate}
                    />

                    {errors.expirationDate && (
                      <Text className="text-red text-sm mt-1">
                        {errors.expirationDate.message}
                      </Text>
                    )}
                  </View>
                )}
              />

              <Controller
                control={control}
                name="securityCode"
                render={({ field: { onChange, onBlur, value } }) => (
                   <View className="flex-1 mb-4">
                    <Input
                      label="Código de segurança *"
                      onBlur={onBlur}
                      keyboardType="numeric"
                      onChangeText={(text) => onChange(formatSecurityCode(text))}
                      value={value}
                      error={!!errors.securityCode}
                    />

                    {errors.securityCode && (
                      <Text className="text-red text-sm mt-1">
                        {errors.securityCode.message}
                      </Text>
                    )}
                  </View>
                )}
              />
            </View>
          </View>

          <View className="w-full mt-4">
            <Checkbox 
              checked={isChecked}
              onPress={() => setIsChecked(!isChecked)}
              text="Meu endereço de cobrança é igual ao meu endereço de entrega"
            />
          </View>
        </View>
      </ScrollView>

      <View className="w-full h-[48px] mt-auto mb-6 px-4">
        <Button 
          title={isChecked ? "Comprar agora" : "Adicionar endereço"} 
          onPress={() => {
            if (isChecked) {
              router.push('/checkout/order')
            } else {
              router.push('/checkout/address')
            }
          }} 
        />
      </View>
    </SafeAreaView>
  )
}