import { ImageBackground, SafeAreaView, Text, View } from "react-native"
import { router } from "expo-router"

import ImgBackground from "@/assets/images/image-background.png"
import SvgComplete from "@/assets/icons/complete.svg"

import { useCart } from "@/context/cart-context"

import { Header } from "@/components/header"
import { Button } from "@/components/button"

import { colors } from "@/styles/theme/colors"

export default function Complete() {
  const { clearCart } = useCart()

  function handleGoHome() {
    clearCart()

    router.replace('/home')
  }

  return (
    <SafeAreaView style={{ flex: 1, paddingTop: 40, backgroundColor: colors.white }}>
      <ImageBackground
        source={ImgBackground}
        className="flex-1"
        resizeMode="cover"
      >
        <Header />

        <View className="flex-1 items-center justify-center">
          <SvgComplete />

          <Text className="font-bold text-2xl text-darker mt-12"> 
            Checkout completado
          </Text>

          <Text className="font-sans text-base text-darker mt-4 max-w-[300px] text-center">
            Obrigado pelo seu pedido. Seu pedido foi despachado e chegará tão 
            rápido quanto o pônei galopa!
          </Text>

          <View className="w-full h-[48px] max-w-[300px] mt-6">
            <Button title="Comprar agora" onPress={handleGoHome} />
          </View>
        </View>
      </ImageBackground>
    </SafeAreaView>
  )
}