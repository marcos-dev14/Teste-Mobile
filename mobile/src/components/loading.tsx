import { ActivityIndicator } from "react-native"

import { colors } from "@/styles/theme/colors"

export function Loading() {
  return (
    <ActivityIndicator 
      size="large" 
      color={colors.green}  
      className="flex-1 justify-center items-center"
    />
  )
}