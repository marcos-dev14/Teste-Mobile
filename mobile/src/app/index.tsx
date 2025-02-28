import { useEffect } from "react"
import { SafeAreaView, Text, ImageBackground } from "react-native"
import { router } from "expo-router"

import ImgBackground from "@/assets/images/image-background.png"
import SvgCart from "@/assets/icons/cart-active.svg"

import { colors } from "@/styles/theme/colors"

export default function Splash() {
  useEffect(() => {
    const checkAuth = async () => {
      await new Promise(resolve => setTimeout(resolve, 2000));

      router.replace("/login")
    };

    checkAuth();
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, paddingTop: 40, backgroundColor: colors.white }}>
      <ImageBackground
        source={ImgBackground}
        className="flex-1 items-center justify-center"
        resizeMode="cover"
      >
        <SvgCart width={120} height={120} />

        <Text className="font-bold text-[32px] text-darker mt-5">
          My Demo {''}
          <Text className="font-light text-[32px] text-darker">
            App
          </Text>
        </Text>
      </ImageBackground>
    </SafeAreaView>
  )
}