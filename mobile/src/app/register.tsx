import { View, Text, SafeAreaView, Alert, ScrollView, Platform } from "react-native"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Link, router } from "expo-router"
import { useMutation } from "@tanstack/react-query"

import { userRegister } from "@/api/user"

import { registerFormSchema, type RegisterFormSchema } from "@/schemas/register-form-schema"

import { Header } from "@/components/header"
import { Input } from "@/components/input"
import { Button } from "@/components/button"

import { colors } from "@/styles/theme/colors"

export default function Register() {
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormSchema>({
    resolver: zodResolver(registerFormSchema),
    mode: "onBlur"
  })

  const { mutateAsync: register, isPending } = useMutation({
    mutationFn: userRegister,
    onSuccess: async () => {
      router.replace("/login");
      
      Alert.alert("Sucesso", "Usuário criado com sucesso!");
    },
    onError: (error: any) => {
      const errorMessage =
        error?.response?.data?.message || error?.message;
  
      Alert.alert("Erro", errorMessage);
    },
  })

  async function handleRegister(data: RegisterFormSchema) {
    try {
      register({
        name: data?.name,
        email: data?.email.toLowerCase(), 
        password: data?.password
      })
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, paddingTop: 40, backgroundColor: colors.white }}>
      <Header backButton linkButton="/login" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Platform.OS === "ios" ? 130 : 40 }}
      >
        <View className="mt-4 px-4">
          <Text className="font-bold text-2xl text-darker">
            Registro
          </Text>

          <View className="w-full h-full mt-[55px] items-center justify-center">
            <Controller 
              control={control}
              name="name"
              render={({ field: { onChange, onBlur, value } }) => (
                <View className="w-full mb-4">
                  <Input
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    error={!!errors.name}
                    placeholder="Nome"
                    placeholderTextColor={colors.darker}
                  />

                  {errors.name && (
                    <Text className="text-red text-sm mt-1">
                      {errors.name.message === "Required" ? "O nome é obrigatório." : errors.name.message}
                    </Text>
                  )}
                </View>
              )}
            />

            <Controller 
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <View className="w-full mb-4">
                  <Input
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    error={!!errors.email}
                    keyboardType="email-address"
                    placeholder="E-mail"
                    placeholderTextColor={colors.darker}
                  />

                  {errors.email && (
                    <Text className="text-red text-sm mt-1">
                      {errors.email.message === "Required" ? "O e-mail é obrigatório." : errors.email.message}
                    </Text>
                  )}
                </View>
              )}
            />

            <Controller 
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <View className="w-full mb-4">
                  <Input
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    error={!!errors.password}
                    placeholder="Senha"
                    placeholderTextColor={colors.darker}
                    secureTextEntry
                  />

                  {errors.password && (
                    <Text className="text-red text-sm mt-1">
                      {errors.password.message === "Required" ? "A senha é obrigatória." : errors.password.message}
                    </Text>
                  )}
                </View>
              )}
            />
            <View className="w-full h-[48px] mt-8">
              <Button 
                title="Cadastrar" 
                disabled={isPending || isSubmitting}
                onPress={handleSubmit(handleRegister)}
              />

              <View className="w-full flex-row items-center justify-center gap-1 mt-4">
                <Text className="font-sans text-base text-darker">
                  Já possui uma conta?
                </Text>
                  
                <Link href="/register">
                  <Text className="font-bold text-base text-darkBlue">
                    Clica aqui
                  </Text>
                </Link>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}