import { View, Text, ScrollView, TouchableOpacity } from "react-native"
import { router, usePathname } from "expo-router"
import { useNavigation } from "@react-navigation/native"

import { useUser } from "@/context/user-context"

import { colors } from "@/styles/theme/colors"

export function DrawerContent() {
  const { logout } = useUser()

  const navigation = useNavigation()
  const pathname = usePathname()

  const routes = navigation.getState()?.routeNames || []

  return (
    <View className="flex-1 bg-white overflow-hidden rounded-lg">
      <View className="w-full px-4 mt-20">
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          <View className="mt-4">
            <Text className="text-base font-sans text-gray-900">
              Test Flows
            </Text>

            <TouchableOpacity 
              style={{
                width: '100%',
                paddingVertical: 12,
                paddingHorizontal: 12,
                borderBottomWidth: 1,
                borderBottomColor: colors.light
              }}
              onPress={() => router.push("/home")}
            >
              <Text 
                className="font-sans text-xl"
                style={{
                  color: pathname === "/home"? colors.darkBlue : colors.darker,
                }}
              >
                Adicionar oao fluxo do carrinho
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={{
                width: '100%',
                paddingVertical: 12,
                paddingHorizontal: 12,
                borderBottomWidth: 1,
                borderBottomColor: colors.light
              }}
              onPress={() => router.push("/home")}
            >
              <Text 
                className="font-sans text-xl"
                style={{
                  color: pathname === "/checkout/order"? colors.darkBlue : colors.darker,
                }}
              >
                Checkout Flow
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={{
                width: '100%',
                paddingVertical: 12,
                paddingHorizontal: 12,
                borderBottomWidth: 1,
                borderBottomColor: colors.light
              }}
              onPress={() => {
                logout()
                router.push("/")
              }}
            >
              <Text 
                className="font-sans text-xl"
                style={{
                  color: pathname === "/"? colors.darkBlue : colors.darker,
                }}
              >
                Log In Flow
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={{
                width: '100%',
                paddingVertical: 12,
                paddingHorizontal: 12,
                borderBottomWidth: 1,
                borderBottomColor: colors.light
              }}
              // onPress={() => router.push("/qr-code-scanner")}
            >
              <Text 
                className="font-sans text-xl"
                style={{
                  color: pathname === "/qr-code-scanner"? colors.darkBlue : colors.darker,
                }}
              >
                QR Code Scanner
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={{
                width: '100%',
                paddingVertical: 12,
                paddingHorizontal: 12,
                borderBottomWidth: 1,
                borderBottomColor: colors.light
              }}
              // onPress={() => router.push("/qr-code-scanner")}
            >
              <Text 
                className="font-sans text-xl"
                style={{
                  color: pathname === "/drawing"? colors.darkBlue : colors.darker,
                }}
              >
                Desenho
              </Text>
            </TouchableOpacity>
          </View>

          <View className="mt-4">
            <Text className="text-base font-sans text-gray-900">
              Actions
            </Text>
            
            <TouchableOpacity 
              style={{
                width: '100%',
                paddingVertical: 12,
                paddingHorizontal: 12,
                borderBottomWidth: 1,
                borderBottomColor: colors.light
              }}
              onPress={() => {
                logout()
                router.push("/")
              }}
            >
              <Text 
                className="font-sans text-xl"
              >
                Log Out
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={{
                width: '100%',
                paddingVertical: 12,
                paddingHorizontal: 12,
                borderBottomWidth: 1,
                borderBottomColor: colors.light
              }}
              onPress={() => {}}
            >
              <Text 
                className="font-sans text-xl"
              >
                Reset App State
              </Text>
            </TouchableOpacity>
          </View>

          <View className="mt-4">
            <Text className="text-base font-sans text-gray-900">
              Other
            </Text>
            
            <TouchableOpacity 
              style={{
                width: '100%',
                paddingVertical: 12,
                paddingHorizontal: 12,
                borderBottomWidth: 1,
                borderBottomColor: colors.light
              }}
              onPress={() => {}}
            >
              <Text 
                className="font-sans text-xl"
              >
                API Calls
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={{
                width: '100%',
                paddingVertical: 12,
                paddingHorizontal: 12,
                borderBottomWidth: 1,
                borderBottomColor: colors.light
              }}
              onPress={() => {}}
            >
              <Text 
                className="font-sans text-xl"
              >
                Report A Bug
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={{
                width: '100%',
                paddingVertical: 12,
                paddingHorizontal: 12,
                borderBottomWidth: 1,
                borderBottomColor: colors.light
              }}
              onPress={() => {}}
            >
              <Text 
                className="font-sans text-xl"
              >
                About
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </View>
  )
}