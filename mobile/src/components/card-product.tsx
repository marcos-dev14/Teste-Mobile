import { View, TouchableOpacity, Text, Image, type TouchableOpacityProps } from "react-native"

import { StartRating } from "./start-rating"

interface CardProductProps extends TouchableOpacityProps {
  title: string
  price: number
  productImage: string
  rating: number | undefined
}

export function CardProduct({
  title,
  price,
  productImage,
  rating,
  ...rest
}: CardProductProps) {
  return (
    <TouchableOpacity 
      className="w-[171px] bg-white rounded-lg border border-light mb-5 overflow-hidden"
      activeOpacity={0.7}
      {...rest}	
    >
      <Image
        source={{ uri: productImage }}
        className="w-full h-40 rounded-lg mb-2"
      />
      
      <View className="w-full items-start p-4">
        <Text className="text-lg font-semibold text-darker mb-2">
          {title}
        </Text>

        <Text className="text-xl font-bold text-darker mb-2">
          R$ {price}
        </Text>

        {rating && (
          <StartRating rating={rating} />
        )}
      </View>
    </TouchableOpacity>
  )
}