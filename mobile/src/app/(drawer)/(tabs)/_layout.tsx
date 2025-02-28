import { View, Text, TouchableOpacity } from "react-native"
import { router, Slot, Tabs } from "expo-router"
import { DrawerActions } from "@react-navigation/native"
import { useNavigation } from "expo-router"

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

  const navigation = useNavigation()
  const handleMenu = () => {
    navigation.dispatch(DrawerActions.openDrawer())
  }

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
          tabBarButton: (props) => (
            <TouchableOpacity
              className="items-center justify-center flex-1" 
              onPress={() => router.push('/home')}
            >
              {props.children}
            </TouchableOpacity>
          ),
        }}
      />

      <Tabs.Screen 
        name="cart"
        options={{
          tabBarIcon: ({ focused }) => (
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
          tabBarLabel: "Carrinho",
          tabBarButton: (props) => (
            <TouchableOpacity
              className="items-center justify-center flex-1" 
              onPress={() => router.push('/cart')}
            >
              {props.children}
            </TouchableOpacity>
          ),
        }}
      />

      <Tabs.Screen 
        name="menu"
        options={{
          tabBarIcon: ({ focused }) => (
            focused? <MenuActive /> : <MenuDefault />
          ),
          tabBarLabel: "Menu",
          tabBarButton: (props) => (
            <TouchableOpacity
              className="items-center justify-center flex-1" 
              onPress={handleMenu}
            >
              {props.children}
            </TouchableOpacity>
          ),
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

      <Tabs.Screen
        name="checkout/order"
        options={{ href: null }}
      />

      <Tabs.Screen
        name="checkout/payment"
        options={{ href: null }}
      />

      <Tabs.Screen
        name="checkout/complete"
        options={{ href: null }}
      />

      <Tabs.Screen
        name="about"
        options={{ href: null }}
      />
      <Slot />
    </Tabs>
  )
}