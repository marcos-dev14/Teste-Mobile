import { ActivityIndicator } from "react-native"

import { styles } from "./styles"
import { colors } from "@/styles/colors"

export function Loading() {
  return (
    <ActivityIndicator size="large" color={colors.green} style={styles.container} />
  )
}