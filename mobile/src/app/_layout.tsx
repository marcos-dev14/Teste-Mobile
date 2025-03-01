import "@/styles/global.css"

import { useEffect } from "react"
import { StatusBar } from "expo-status-bar"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import { Slot, Stack } from "expo-router"
import * as SplashScreen from 'expo-splash-screen'
import { 
  useFonts,
  NotoSans_400Regular,
  NotoSans_500Medium,
  NotoSans_600SemiBold,
  NotoSans_700Bold,
  NotoSans_300Light
} from "@expo-google-fonts/noto-sans" 
import { QueryClientProvider } from "@tanstack/react-query"

import { queryClient } from "@/lib/queryClient"
import { CartContextProvider } from "@/context/cart-context"
import { UserProvider } from "@/context/user-context"

SplashScreen.preventAutoHideAsync();

export default function Layout() {
  const [ fontsLoaded, fontError ] = useFonts({
    NotoSans_300Light,
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
      <UserProvider>
        <CartContextProvider>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <Stack>
              <Stack.Screen
                  name="index"
                  options={{
                    headerShown: false,
                  }}
                />

              <Stack.Screen
                name="login"
                options={{
                  headerShown: false,
                }}
              />

              <Stack.Screen
                name="register"
                options={{
                  headerShown: false,
                }}
              />

              <Stack.Screen
                name="(tabs)"
                options={{
                  headerShown: false,
                  animation: 'fade_from_bottom',
                }}
              />

              <Stack.Screen
                name="(drawer)"
                options={{
                  headerShown: false,
                }}
              />

              <Slot />
            </Stack>

            <StatusBar style="dark" translucent backgroundColor="transparent" />
          </GestureHandlerRootView>
        </CartContextProvider>
      </UserProvider>
    </QueryClientProvider>
  )
}