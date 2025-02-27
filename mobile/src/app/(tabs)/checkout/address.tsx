import { SafeAreaView, ScrollView, Text, TextInput, View } from "react-native"
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { AddressFormData, addressFormSchema } from "@/schemas/address-form-schema"

import { Header } from "@/components/header"
import { Input } from "@/components/input"
import { Button } from "@/components/button"

import { colors } from "@/styles/theme/colors"
import { useState } from "react"
import { formatZipCode } from "@/utils/format-zip-code"

export default function AddressCheckout() {
  const [zipCode, setZipCode] = useState("");

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<AddressFormData>({
    resolver: zodResolver(addressFormSchema),
  });

  function onSubmit(data: AddressFormData) {
    console.log("Dados do formulário: ", JSON.stringify(data));
  }

  return (
    <SafeAreaView style={{ flex: 1, paddingTop: 40, backgroundColor: colors.white }}>
      <Header backButton linkButton="/cart" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <View className="w-full px-4 mt-4">
          <Text className="font-bold text-2xl text-darker">Checkout</Text>

          <Text className="font-semibold text-lg text-darker mt-4">
            Enter a shipping address
          </Text>

          <View className="w-full mt-6">
            <Controller
              control={control}
              name="full_name"
              render={({ field: { onChange, onBlur, value } }) => (
                <View className="flex-1 mb-4">
                  <Input
                    label="Full Name *"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    error={!!errors.full_name}
                  />
  
                  {errors.full_name && (
                    <Text className="text-red text-sm mt-1">
                      {errors.full_name.message}
                    </Text>
                  )}
                </View>
              )}
            />

            <Controller
              control={control}
              name="address_line_1"
              render={({ field: { onChange, onBlur, value } }) => (
                <View className="flex-1 mb-4">
                  <Input
                    label="Address Line 1 *"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    error={!!errors.address_line_1}
                  />

                  {errors.address_line_1 && (
                    <Text className="text-red text-sm mt-1">
                      {errors.address_line_1.message}
                    </Text>
                  )}
                </View>
              )}
            />

            <Controller
              control={control}
              name="address_line_2"
              render={({ field: { onChange, onBlur, value } }) => (
                <View className="flex-1 mb-4">
                  <Input
                    label="Address Line 2 *"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    error={!!errors.address_line_2}
                  />

                  {errors.address_line_2 && (
                    <Text className="text-red text-sm mt-1">
                      {errors.address_line_2.message}
                    </Text>
                  )}
                </View>
              )}
            />

            <View className="flex-row w-full justify-between gap-4">
              <Controller
                control={control}
                name="city"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View className="flex-1 mb-4">
                    <Input
                      label="City *"
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      error={!!errors.city}
                    />

                    {errors.city && (
                      <Text className="text-red text-sm mt-1">
                        {errors.city.message}
                      </Text>
                    )}
                  </View>
                )}
              />

              <Controller
                control={control}
                name="state"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View className="flex-1 mb-4">
                    <Input
                      label="State / Region *"
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      error={!!errors.state}
                    />

                    {errors.state && (
                      <Text className="text-red text-sm mt-1">
                        {errors.state.message}
                      </Text>
                    )}
                  </View>
                )}
              />
            </View>

            <View className="flex-row w-full justify-between gap-4">
              <Controller
                control={control}
                name="zip_code"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View className="flex-1 mb-4">
                    <Input
                      label="Zip Code *"
                      onBlur={onBlur}
                      keyboardType="numeric"
                      value={value}
                      onChangeText={(text) => onChange(formatZipCode(text))}
                      error={!!errors.zip_code}
                    />

                    {errors.zip_code && (
                      <Text className="text-red text-sm mt-1">
                        {errors.zip_code.message}
                      </Text>
                    )}
                  </View>
                )}
              />

              <Controller
                control={control}
                name="country"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View className="flex-1 mb-4">
                    <Input
                      label="Country *"
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      error={!!errors.country} 
                    />

                    {errors.country && (
                      <Text className="text-red text-sm mt-1">
                        {errors.country.message}
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
        <Button title="Continuar" onPress={handleSubmit(onSubmit)} />
      </View>
    </SafeAreaView>
  );
}
