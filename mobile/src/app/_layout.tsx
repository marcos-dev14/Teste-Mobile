import { StatusBar, View } from "react-native"
import { Stack } from "expo-router"
import {
  useFonts,
  NotoSans_400Regular,
  NotoSans_600SemiBold,
  NotoSans_700Bold
} from "@expo-google-fonts/noto-sans"

import { colors } from "@/styles/colors"

import { Loading } from "@/components/loading"

export default function Layout() {
  const [fontsLoaded, fontError] = useFonts([
    NotoSans_400Regular,
    NotoSans_600SemiBold,
    NotoSans_700Bold,
  ])

  if(!fontsLoaded) {
    return <Loading />
  }

  return (
    <View style={{ flex: 1 }}>
      <Stack 
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: colors.white
          }
        }}
      />
      
      <StatusBar
        barStyle="dark-content"
        backgroundColor={colors.white}
        translucent
      />
    </View>
  )
}