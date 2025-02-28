import { useState } from "react"
import { View, Text, Image, SafeAreaView, TouchableOpacity, ScrollView } from "react-native"
import { useLocalSearchParams } from "expo-router"
import { Ionicons } from "@expo/vector-icons"

import { useCart } from "@/context/cart-context"

import { getProductById } from "@/api/products"

import { Header } from "@/components/header"
import { StartRating } from "@/components/start-rating"
import { Button } from "@/components/button"
import { useQuery } from "@tanstack/react-query"
import { Loading } from "@/components/loading"

import { colors } from "@/styles/theme/colors"


export default function ProductDetails() {
  const [quantity, setQuantity] = useState(1)

  const { id } = useLocalSearchParams<{ id: string  }>()

  const { data: productData, isFetching } = useQuery({
    queryKey: ['products', id],
    queryFn: () => getProductById(id)
  })
  
  const productImage = productData?.images[0]

  const { addToCart } = useCart()

  function increaseQuantity() {
    setQuantity(quantity + 1)
  }

  function decreaseQuantity() {
    if (quantity > 1) {
      setQuantity(quantity - 1)
    }
  }

  function handleAddToCart() {
    if (productData) {
      addToCart({ 
        id: productData?.id,
        name: productData?.name,
        price: productData?.price,
        rating: productData?.rating,
        quantity,
        image: productData?.images[0]
      })
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, paddingTop: 40, backgroundColor: colors.white }}>
      <Header 
        backButton
        linkButton="/"
      />

      {isFetching ? (
        <Loading />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          <View className="px-4 w-full mt-4">
            <View className="w-full items-start">
              <Text className="font-bold text-2xl text-darker mb-2">
                {productData?.name}
              </Text>

              {productData?.rating && (
                <StartRating rating={productData?.rating} />
              )}
            </View>

            <Image 
              source={{ uri: productImage }} 
              className="w-full h-[358px] rounded-lg mt-4"
            />
          
            <View className="w-full items-start mt-10">
              <Text className="font-bold text-3xl text-darker">
                R$ {productData?.price}
              </Text>

              <View className="w-full flex-row items-center justify-between mt-4"> 
                <View className="mr-4 flex-row items-center justify-center">
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={decreaseQuantity}
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
                    onPress={increaseQuantity}
                    className="p-1 items-center justify-center"
                  >
                    <Ionicons name="add-circle-outline" size={25} color={colors.darkBlue} />
                  </TouchableOpacity>
                </View>

                <View className="w-[211px] h-[48px]">
                  <Button 
                    title="Adicionar ao carrinho" 
                    onPress={handleAddToCart}  
                  />
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}