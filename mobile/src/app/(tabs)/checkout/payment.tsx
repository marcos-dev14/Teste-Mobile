import { SafeAreaView, ScrollView, Text, View } from "react-native"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { MaterialIcons } from "@expo/vector-icons"

import { paymentFormSchema, type PaymentFormSchema } from "@/schemas/payment-form-schema"

import { Header } from "@/components/header"
import { Input } from "@/components/input"
import { Button } from "@/components/button"

import { colors } from "@/styles/theme/colors"
import { router } from "expo-router"

export default function Payment() {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<PaymentFormSchema>({
    resolver: zodResolver(paymentFormSchema),
  })

  return (
    <SafeAreaView style={{ flex: 1, paddingTop: 40, backgroundColor: colors.white }}>
      <Header backButton linkButton="/checkout/order" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <View className="w-full px-4 mt-4">
          <Text className="font-bold text-2xl text-darker">Checkout</Text>

          <Text className="font-semibold text-lg text-darker mt-4">
            Enter a payment method
          </Text>

          <Text className="font-sans text-base text-darker mt-4">
            You will not be charged until you review your purchase on the next screen.
          </Text>

          <View className="flex-row items-center justify-between mb-4 mt-6">
            <Text className="font-semibold text-lg text-darker">
              Card
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
                    label="Full Name *"
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
                    label="Card Number *"
                    onBlur={onBlur}
                    onChangeText={onChange}
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
                    label="Card Number *"
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
                      label="Expiration Date *"
                      onBlur={onBlur}
                      onChangeText={onChange}
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
                      label="Security Code *"
                      onBlur={onBlur}
                      onChangeText={onChange}
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
        </View>
      </ScrollView>

      <View className="w-full h-[48px] mt-auto mb-6 px-4">
        <Button title="Comprar agora" onPress={() => router.replace('/checkout/complete')} />
      </View>
    </SafeAreaView>
  )
}