import { View, Text, Image, TouchableOpacity, Alert } from "react-native"
import { Ionicons } from "@expo/vector-icons"

import { useCart } from "@/context/cart-context"

import { StartRating } from "./start-rating"

import { colors } from "@/styles/theme/colors"

interface CartCardProductProps {
  id: string
  name: string
  price: number
  image: string
  rating?: number
  quantity: number
  cardFooter?: boolean
}

export function CartCardProduct({
  id,
  name,
  price,
  image,
  rating,
  quantity,
  cardFooter = true
}: CartCardProductProps) {
  const { removeItemCart, updateQuantity } = useCart()

  function handleRemoveItemCart(id: string) {
    Alert.alert(
      'Confirmar Remoção',
      'Tem certeza que deseja remover este item?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sim',
          onPress: () => {
            removeItemCart(id);
          },
          style: 'destructive',
        },
      ]
    );
  }

  return (
    <View className="w-full h-[240px] flex-row rounded-lg overflow-hidden border border-light">
      <Image 
        source={{ uri: image }}
        className="w-[160px] h-full"
        resizeMode="cover"
      />

      <View className="flex-1 p-4">
        <Text className="font-semibold text-base text-darker mb-2">
          {name}
        </Text>

        {rating && (
          <StartRating rating={rating} />
        )}

        <Text className="font-bold text-xl text-darker mt-4">
          R$ {price.toFixed(2)}
        </Text>

        {cardFooter && (
          <View className="flex-row items-center justify-between mt-auto">
            <View className="mr-4 flex-row items-center justify-center">
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => updateQuantity(id, quantity - 1)}
                disabled={quantity === 0}
                className="p-1 items-center justify-center"
              >
                <Ionicons 
                  name="remove-circle-outline" 
                  size={25} 
                  color={quantity === 0 ? colors.light : colors.darkBlue}  
                />
              </TouchableOpacity>

              <Text className="font-semibold text-base text-darker mx-2">
                {quantity}
              </Text>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => updateQuantity(id, quantity + 1)}
                className="p-1 items-center justify-center"
              >
                <Ionicons name="add-circle-outline" size={25} color={colors.darkBlue} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              className="p-2 items-center justify-center"
              activeOpacity={0.7}
              onPress={() => handleRemoveItemCart(id)}
            >
              <Text className="font-bold text-base text-red">
                Remover
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  )
}