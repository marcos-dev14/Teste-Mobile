import { Slot } from "expo-router"
import { Drawer } from "expo-router/drawer"

import { DrawerContent } from "@/components/drawer-content"

export default function DrawerLayout() {
  return (
    <Drawer
      screenOptions={{
        drawerStyle: {
          borderRadius: 0,
        }
      }}

      drawerContent={() => <DrawerContent />}
    >
      <Drawer.Screen 
        name="(tabs)" 
        options={{
          headerShown: false,
        }}
      />

      <Slot />
    </Drawer>
  )
}