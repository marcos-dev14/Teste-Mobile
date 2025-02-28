import { View, Text, SafeAreaView, ImageBackground, TouchableOpacity } from "react-native"
import { router } from "expo-router"

import ImgBackground from "@/assets/images/image-background.png"
import SvgAppIcon from "@/assets/icons/app-icon.svg"

import { colors } from "@/styles/theme/colors"

export default function About() {
  return (
    <SafeAreaView style={{ flex: 1, paddingTop: 40, backgroundColor: colors.white }}>
      <ImageBackground
        source={ImgBackground}
        className="flex-1 items-center justify-center"
        resizeMode="cover"
      >
        <Text className="font-bold text-2xl text-darker">
          Sobre
        </Text>

        <View className="mt-10 items-center">  
          <SvgAppIcon width={50} height={50} />

          <Text className="font-bold text-lg text-darker mt-5">
            My Demo {''}
            <Text className="font-light text-lg text-darker">
              App
            </Text>
          </Text>

          <Text className="text-lg text-darker mt-5 max-w-[300px] text-center">
            Um aplicativo para executar testes
            v1.5.0-build 188 
          </Text>

          <TouchableOpacity
            onPress={() => router.push('/home')} 
            className="mt-5"
          >
            <Text className="font-semibold text-lg text-darkBlue">
              Visite nosso site
            </Text>
          </TouchableOpacity>
        </View>

      </ImageBackground>
    </SafeAreaView>
  )
}