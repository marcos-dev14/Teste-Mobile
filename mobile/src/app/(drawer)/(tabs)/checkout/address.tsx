import { useState } from "react"
import { Alert, Platform, SafeAreaView, ScrollView, Text, View } from "react-native"
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { router } from "expo-router"

import { useUser } from "@/context/user-context"

import { AddressFormData, addressFormSchema } from "@/schemas/address-form-schema"

import { formatZipCode } from "@/utils/format-zip-code"
import { createAddress, getAddressByUserId } from "@/api/address"

import { Header } from "@/components/header"
import { Input } from "@/components/input"
import { Button } from "@/components/button"
import { Checkbox } from "@/components/checkbox"

import { colors } from "@/styles/theme/colors"

export default function AddressCheckout() {
  const [isChecked, setIsChecked] = useState(false)

  const { user } = useUser()

  const queryClient = useQueryClient()

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AddressFormData>({
    resolver: zodResolver(addressFormSchema),
  })

  const { data: addressUserData } = useQuery({
    queryKey: ['address-user'],
    queryFn: () => getAddressByUserId(user?.id)
  })

  const { mutateAsync: createAddressMutation, isPending } = useMutation({
    mutationFn: createAddress,
    onSuccess: () => {
      router.replace('/checkout/payment')

      queryClient.invalidateQueries({ queryKey: ["address-user"] });
      Alert.alert('Sucesso', 'Endereço enviado com sucesso!');
    },
    onError: () => {
      Alert.alert('Erro', 'Ocorreu um erro ao enviar o endereço.');
    },
  });

  function onSubmit(data: AddressFormData) {
    const formData = {
      userId: user?.id || null,
      fullName: data.fullName,
      addressLine1: data.addressLine1,
      addressLine2: data.addressLine2 || undefined,
      city: data.city,
      state: data.state,
      zipCode: formatZipCode(data.zipCode),
      country: data.country,
    }

    createAddressMutation(formData)
  }

  const handleFormSubmit = handleSubmit((data) => {
    if (isChecked) {
      router.push('/checkout/payment');
    } else {
      onSubmit(data);
    }
  });

  return (
    <SafeAreaView style={{ flex: 1, paddingTop: 40, backgroundColor: colors.white }}>
      <Header backButton linkButton="/cart" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Platform.OS === 'ios' ? 160 : 40}}
      >
        <View className="w-full px-4 mt-4">
          <Text className="font-bold text-2xl text-darker">Checkout</Text>

          <Text className="font-semibold text-lg text-darker mt-4">
            Endereço de entrega
          </Text>

          <View className="w-full mt-6">
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
              name="addressLine1"
              render={({ field: { onChange, onBlur, value } }) => (
                 <View className="flex-1 mb-4">
                  <Input
                    label="Endereço 1 *"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    error={!!errors.addressLine1}
                  />

                  {errors.addressLine1 && (
                    <Text className="text-red text-sm mt-1">
                      {errors.addressLine1.message}
                    </Text>
                  )}
                </View>
              )}
            />

            <Controller
              control={control}
              name="addressLine2"
              render={({ field: { onChange, onBlur, value } }) => (
                 <View className="flex-1 mb-4">
                  <Input
                    label="Endereço 2 *"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value || undefined}
                    error={!!errors.addressLine2}
                  />

                  {errors.addressLine2 && (
                    <Text className="text-red text-sm mt-1">
                      {errors.addressLine2.message}
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
                      label="Cidade *"
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
                      label="Estado *"
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
                name="zipCode"
                render={({ field: { onChange, onBlur, value } }) => (
                   <View className="flex-1 mb-4">
                    <Input
                      label="Código postal *"
                      onBlur={onBlur}
                      keyboardType="numeric"
                      value={value}
                      onChangeText={(text) => onChange(formatZipCode(text))}
                      error={!!errors.zipCode}
                    />

                    {errors.zipCode && (
                      <Text className="text-red text-sm mt-1">
                        {errors.zipCode.message}
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
                      label="País *"
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

          {addressUserData && addressUserData?.length >= 1 && (
            <View className="w-full mt-4">
              <Checkbox 
                checked={isChecked}
                onPress={() => setIsChecked(!isChecked)}
                text="Usar o endereço já cadastrado"
              />
            </View>
          )}

        </View>
      </ScrollView>

      <View className="w-full h-[48px] mt-auto mb-6 px-4">
        <Button 
          title="Continuar" 
          onPress={handleFormSubmit} 
          disabled={isSubmitting || isPending}
        />
      </View>
    </SafeAreaView>
  );
}
