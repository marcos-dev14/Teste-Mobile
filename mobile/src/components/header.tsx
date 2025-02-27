import { View, Text, TouchableOpacity } from "react-native"
import { Link, type Href } from "expo-router"
import { AntDesign } from "@expo/vector-icons"

import { colors } from "@/styles/theme/colors"

interface HeaderProps {
  backButton?: boolean
  linkButton?: Href;
}

export function Header({
  backButton = false,
  linkButton
}: HeaderProps) {
  return (
    <View className="w-full h-16 px-5 flex-row items-center justify-between border-b-2 border-b-light">
      {backButton && linkButton  ? (
        <Link href={linkButton} asChild>
          <TouchableOpacity
            className="p-2 items-center justify-center"
            activeOpacity={0.7}
          >
            <AntDesign name="arrowleft" size={16} color={colors.darker} />
          </TouchableOpacity>
        </Link>
      ) : (
        <View className="p-2 items-center justify-center" />
      )}

      <Text className="text-lg font-sans font-bold text-darker">
        My Demo {''}
        <Text className="text-lg font-sans font-normal text-darker">
          App
        </Text>
      </Text>

      <View className="p-2 items-center justify-center" />
    </View>
  )
}