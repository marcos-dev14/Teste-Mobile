import { router } from "expo-router"
import { useState } from "react"
import { Alert, Platform, SafeAreaView, ScrollView, Text, View } from "react-native"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { MaterialIcons } from "@expo/vector-icons"
import { useMutation, useQuery } from "@tanstack/react-query"

import { useUser } from "@/context/user-context"
import { useCart } from "@/context/cart-context"

import { createOrder } from "@/api/order"
import { paymentFormSchema, type PaymentFormSchema } from "@/schemas/payment-form-schema"
import { getAddressByUserId } from "@/api/address"
import { formatCardNumber } from "@/utils/format-card-number"
import { formatExpirationDate } from "@/utils/format-expiration-data"
import { formatSecurityCode } from "@/utils/format-security-code"

import { Header } from "@/components/header"
import { Input } from "@/components/input"
import { Button } from "@/components/button"
import { Checkbox } from "@/components/checkbox"

import { colors } from "@/styles/theme/colors"

interface formDataPaymentMethods {
  fullName: string
  fullNameOnCard: string
  cardNumber: string
  expirationDate: string
  securityCode: string
}

export default function Payment() {
  const [isChecked, setIsChecked] = useState(true)

  const { user } = useUser()
  const { cart, totalPrice } = useCart()

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<PaymentFormSchema>({
    resolver: zodResolver(paymentFormSchema),
  })

  const { data: addressUserData } = useQuery({
    queryKey: ['address-user'],
    queryFn: () => getAddressByUserId(user?.id)
  })

  const { mutateAsync: createOrderMutation } = useMutation({
    mutationFn: createOrder,
    onSuccess: () => {
      router.replace('/checkout/complete')
    },
    onError: () => {
      Alert.alert('Erro', 'Ocorreu um erro ao finalizar a compra.');
    },
  });

  function handleEndPurchase(data: formDataPaymentMethods) {
    const {  
      fullName,
      fullNameOnCard,
      cardNumber,
      expirationDate,
      securityCode,
    } = data

    const addressData = addressUserData ? addressUserData[0] : undefined

    if (!fullName || !fullNameOnCard || !cardNumber || !expirationDate || !securityCode || !addressData) {
      Alert.alert("Por favor, preencha todos os dados para finalizar a compra!");
      return;
    }

    const formattedData = {
      userId: user?.id,
      addressId: addressData?.id,
      items: cart.map((product) => ({
        productId: product.id, 
        quantity: product.quantity, 
        price: product.price,
      })),
      totalItems: cart.length,
      totalPrice: Number(totalPrice.toFixed(2)),
    }

    createOrderMutation(formattedData)
  }

  return (
    <SafeAreaView style={{ flex: 1, paddingTop: 40, backgroundColor: colors.white }}>
      <Header backButton linkButton="/checkout/order" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Platform.OS === "ios" ? 130 : 40 }}
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
                    label="Full Name on Card *"
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
                      label="Security Code *"
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

          <View className="w-full">
            <Checkbox 
              checked={isChecked}
              onPress={() => setIsChecked(!isChecked)}
            />
          </View>
        </View>
      </ScrollView>

      <View className="w-full h-[48px] mt-auto mb-6 px-4">
        <Button title="Comprar agora" onPress={handleSubmit(handleEndPurchase)} />
      </View>
    </SafeAreaView>
  )
}