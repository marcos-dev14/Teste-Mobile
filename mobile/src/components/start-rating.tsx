import { View } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"

import { colors } from "@/styles/theme/colors"

interface StartRatingProps {
  rating: number;
}

export function StartRating({ rating }: StartRatingProps) {
  const totalStars = 5
  const filledStars = Math.floor(rating)

  return (
    <View className="flex-row">
      {[...Array(totalStars)].map((_, index) => {
        if (index < filledStars) {
          return <MaterialIcons key={index} name="stars" size={20} color={colors.yellow} />
        } else {
          return <MaterialIcons key={index} name="stars" size={20} color={colors.light} />
        }
      })}
    </View>
  )
}