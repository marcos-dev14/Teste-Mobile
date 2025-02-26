import { Tabs } from "expo-router"

import CatalogDefault from "@/assets/icons/catalog-default.svg"
import CatalogActive from "@/assets/icons/catalog-active.svg"
import CartDefault from "@/assets/icons/cart-default.svg"
import CartActive from "@/assets/icons/cart-active.svg"
import MenuDefault from "@/assets/icons/menu-default.svg"
import MenuActive from "@/assets/icons/menu-active.svg"

export default function TabLayout() {
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
        name="index"
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
            focused? <CartActive /> : <CartDefault />
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
        options={{
          tabBarButton: () => null,
          tabBarStyle: { display: 'none' },
        }} 
      />
    </Tabs>
  )
}