import { View, Text } from "react-native"
import { Tabs } from "expo-router"

import { useCart } from "@/context/cart-context"

import CatalogDefault from "@/assets/icons/catalog-default.svg"
import CatalogActive from "@/assets/icons/catalog-active.svg"
import CartDefault from "@/assets/icons/cart-default.svg"
import CartActive from "@/assets/icons/cart-active.svg"
import MenuDefault from "@/assets/icons/menu-default.svg"
import MenuActive from "@/assets/icons/menu-active.svg"

export default function TabLayout() {
  const { cart } = useCart()
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#FFF",
          minHeight: 64,
          borderTopWidth: 1,
          borderColor: "#EDEDED"
        },
        tabBarLabelStyle: {
          fontSize: 14,
          fontWeight: "regular",
          fontFamily: "Poppins_400Regular",
          color: "#132322"
        }
      }}
    >
      <Tabs.Screen 
        name="home"
        options={{
          tabBarIcon: ({ focused }) => (
            focused? <CatalogActive /> : <CatalogDefault />
          ),
          tabBarLabel: "Catalogo",
        }}
      />

      <Tabs.Screen 
        name="cart"
        options={{
          tabBarIcon: ({ focused }) => (
            // focused? <CartActive /> : <CartDefault />
            <View className="relative">
              {focused ? <CartActive /> : <CartDefault />}
              {itemCount > 0 && (
                <View className="w-4 h-4 rounded-full bg-red absolute -top-1 -right-1 items-center justify-center">
                  <Text className="text-white text-xs font-bold">
                    {itemCount}
                  </Text>
                </View>
              )}
            </View>
          ),
          tabBarLabel: "Carrinho"
        }}
      />

      <Tabs.Screen 
        name="menu"
        options={{
          tabBarIcon: ({ focused }) => (
            focused? <MenuActive /> : <MenuDefault />
          ),
          tabBarLabel: "Menu"
        }}
      />

      <Tabs.Screen
        name="product/[id]"
        options={{ href: null }}
      />

      <Tabs.Screen
        name="checkout/address"
        options={{ href: null }}
      />
    </Tabs>
  )
}