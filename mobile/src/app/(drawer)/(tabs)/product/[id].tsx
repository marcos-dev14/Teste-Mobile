import { useEffect, useState } from "react"
import { View, Text, Image, SafeAreaView, TouchableOpacity, ScrollView, Alert } from "react-native"
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

import type { ProductColorsProps } from "@/types/product"

export default function ProductDetails() {
  const [quantity, setQuantity] = useState(1)

  const { id } = useLocalSearchParams<{ id: string  }>()

  const { data: productData, isFetching } = useQuery({
    queryKey: ['products', id],
    queryFn: () => getProductById(id)
  })

  const [selectedColor, setSelectedColor] = useState<ProductColorsProps | null>(
    productData?.colors[0] || null
  )

  const { addToCart } = useCart()

  function increaseQuantity() {
    setQuantity(quantity + 1)
  }

  function decreaseQuantity() {
    if (quantity > 1) {
      setQuantity(quantity - 1)
    }
  }

  function handleColorPress(color: ProductColorsProps) {
    setSelectedColor(color)
    setQuantity(1)
  }

  function handleAddToCart() {
    if (!selectedColor) {
      return Alert.alert("Selecione uma cor")
    }

    if (productData && selectedColor) {
      addToCart({ 
        id: productData?.id,
        name: productData?.name,
        price: productData?.price,
        rating: productData?.rating,
        quantity,
        image: selectedColor.images[0],
        color: {
          id: selectedColor.id,
          name: selectedColor.name,
          hex: selectedColor.hex,
          images: selectedColor.images,
        },
      })
    }
  }

  useEffect(() => {
    setQuantity(1)

    if (productData?.colors && productData.colors.length > 0) {
      setSelectedColor(productData.colors[0]);
    }
  }, [productData]);

  return (
    <SafeAreaView style={{ flex: 1, paddingTop: 40, backgroundColor: colors.white }}>
      <Header 
        backButton
        linkButton="/home"
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

            {selectedColor?.images.map((image, index) => (
              <Image 
                key={index}
                source={{ uri: image }} 
                className="w-full h-[358px] rounded-lg mt-4"
              />
            ))}

            <View className="w-full items-start mt-5">
              {productData?.colors && (
                <View className="flex-row items-center justify-start gap-2 mt-4">
                  <Text className="font-semibold text-xl text-darker">
                    Cor:
                  </Text>

                  {productData.colors.map((color) => (
                    <TouchableOpacity
                      key={color.id}
                      activeOpacity={0.4}
                      onPress={() => handleColorPress(color)}
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 12,
                        backgroundColor: color.hex,
                        marginRight: 6,
                        borderWidth: 2,
                        borderColor: colors.light,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    />
                  ))}
                </View>
              )}

              <Text className="font-bold text-3xl text-darker mt-4">
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