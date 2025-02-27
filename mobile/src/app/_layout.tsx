import "@/styles/global.css"

import { useEffect } from "react"
import { View } from "react-native"
import { StatusBar } from "expo-status-bar"
import { Slot } from "expo-router"
import * as SplashScreen from 'expo-splash-screen';
import { 
  useFonts,
  NotoSans_400Regular,
  NotoSans_500Medium,
  NotoSans_600SemiBold,
  NotoSans_700Bold
} from "@expo-google-fonts/noto-sans" 
import { QueryClientProvider } from "@tanstack/react-query"

import { queryClient } from "@/lib/queryClient"
import { CartContextProvider } from "@/context/cart-context"

SplashScreen.preventAutoHideAsync();

export default function Layout() {
  const [ fontsLoaded, fontError ] = useFonts({
    NotoSans_400Regular,
    NotoSans_500Medium,
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
    <QueryClientProvider client={queryClient}>
      <CartContextProvider>
        <View style={{ flex: 1 }}>
          <StatusBar style="dark" translucent backgroundColor="transparent" />

          <Slot />
        </View>
      </CartContextProvider>
    </QueryClientProvider>
  )
}