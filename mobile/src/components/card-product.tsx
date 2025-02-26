import { View, TouchableOpacity, Text, Image, type TouchableOpacityProps } from "react-native"
import { StartRating } from "./start-rating"

interface CardProductProps extends TouchableOpacityProps {
  title: string
  price: string
  productImage: string
  rating: number
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
      {/* <Image
        source={productImage}
        className="w-full h-40 rounded-lg mb-2"
      /> */}
      <View className="w-full h-[170px] bg-slate-300" />
      
      <View className="w-full items-start p-4">
        <Text className="text-lg font-semibold text-darker mb-2">
          {title}
        </Text>

        <Text className="text-xl font-bold text-darker mb-2">
          {price}
        </Text>

        <StartRating rating={rating} />
      </View>
    </TouchableOpacity>
  )
}