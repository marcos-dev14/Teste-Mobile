import { SafeAreaView, View, Text, ScrollView, Alert, Platform, TouchableOpacity } from "react-native"
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from "@tanstack/react-query"

import { loginFormSchema, type LoginFormSchema } from "@/schemas/login-form-schema"

import { Header } from "@/components/header"
import { Input } from "@/components/input"
import { Button } from "@/components/button"

import { colors } from "@/styles/theme/colors"
import { userLogin } from "@/api/user"
import { router } from "expo-router"
import { useUser } from "@/context/user-context"
import { useEffect, useState } from "react"
import { Loading } from "@/components/loading"

export default function Login() {
  const [isLoading, setIsLoading] = useState(false)

  const { user, saveUserData } = useUser()

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormSchema>({
    resolver: zodResolver(loginFormSchema),
    mode: "onBlur"
  })

  const { mutateAsync: authenticate, isPending } = useMutation({
    mutationFn: userLogin,
    onSuccess: async (data) => {
      
      router.replace("/home");
      
      Alert.alert("Sucesso", "Usuário logado com sucesso!");
      saveUserData(data.user);
    },
    onError: (error: any) => {
      const errorMessage =
        error?.response?.data?.message || error?.message;
  
      Alert.alert("Erro", errorMessage);
    },
  });

  async function handleLogin(data: LoginFormSchema) {
    try {
      authenticate({
        email: data?.email.toLowerCase(), 
        password: data?.password
      })
    } catch (error) {
      console.error(error);
    }
  }

  function handleAutomaticData() {
    const email = "bob@example.com";
    const password = "10203040";

    setValue("email", email);
    setValue("password", password);
  }

  useEffect(() => {
    setIsLoading(true)

    if (user) {
      return router.replace("/home");
    }

    setIsLoading(false)
  }, [user]);

  return (
    <SafeAreaView style={{ flex: 1, paddingTop: 40, backgroundColor: colors.white }}>
      {isLoading ? (
        <Loading />
      ) : (
        <>
          <Header />

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: Platform.OS === "ios" ? 130 : 40 }}
          >
            <View className="mt-4 px-4">
              <Text className="font-bold text-2xl text-darker">
                Login
              </Text>

              <Text className="font-sans text-base text-darker mt-4">
                Selecione um email e uma senha na lista abaixo 
                e clique no botão "Login" para entrar. Você também pode ou 
                clique no email para preencher automaticamente 
                o email e a senha.
              </Text>

              <View className="mt-[55px]">
                <Controller 
                  control={control}
                  name="email"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <View className="flex-1 mb-4">
                      <Input
                        onBlur={onBlur}
                        onChangeText={onChange}
                        value={value}
                        error={!!errors.email}
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
                    <View className="flex-1 mb-4">
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
                    title="Login" 
                    disabled={isPending}
                    onPress={handleSubmit(handleLogin)}
                  />
                </View>
              </View>

              <View className="w-full p-4 border border-light bg-[#FBFBFB] mt-[50px]">
                <TouchableOpacity
                  onPress={handleAutomaticData}
                >
                  <View className="w-full">
                    <Text className="font-bold text-base text-darker">
                      Nomes de usuário aceitos:
                    </Text>

                    <Text className="font-sans text-base text-darker">
                      bob@example.com
                    </Text>
                    <Text className="font-sans text-base text-darker">
                      alice@example.com (locked out)
                    </Text>
                  </View>
                </TouchableOpacity>

                <View className="w-full mt-4">
                  <Text className="font-bold text-base text-darker">
                    Senha para todos os usuários:
                  </Text>

                  <Text className="font-sans text-base text-darker">
                    10203040
                  </Text>
                </View>
              </View>
            </View>
          </ScrollView>
        </>
      )}
    </SafeAreaView>
  )
}