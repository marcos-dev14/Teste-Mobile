import "@/styles/global.css"

import { useEffect } from "react"
import { View } from "react-native"
import { StatusBar } from "expo-status-bar"
import { Slot } from "expo-router"
import * as SplashScreen from 'expo-splash-screen';
import { 
  useFonts,
  NotoSans_400Regular,
  NotoSans_600SemiBold,
  NotoSans_700Bold
} from "@expo-google-fonts/noto-sans" 

SplashScreen.preventAutoHideAsync();

export default function Layout() {
  const [ fontsLoaded, fontError ] = useFonts({
    NotoSans_400Regular,
    NotoSans_600SemiBold,
    NotoSans_700Bold,
  })

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="dark" translucent backgroundColor="transparent" />

      <Slot />
    </View>
  )
}