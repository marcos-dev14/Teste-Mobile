import { Link } from 'expo-router'
import { View, Text, SafeAreaView, ImageBackground, FlatList } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'

import { useCart } from '@/context/cart-context'

import ImgBackground from "@/assets/images/image-background.png"

import { Header } from '@/components/header'
import { Button } from '@/components/button'
import { CartCardProduct } from '@/components/cart-card-product'

import { colors } from '@/styles/theme/colors'

export default function Cart() {
  const { cart, totalPrice } = useCart()

  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <SafeAreaView style={{ flex: 1, paddingTop: 40, backgroundColor: colors.white }}>
      <ImageBackground
        source={ImgBackground}
        className="flex-1"
        resizeMode="cover"
      >
        <Header />

        {cart.length >= 1 && (
          <View className="flex-1 px-4 mt-4">
            <View className="w-full items-start justify-start mb-4">
              <Text className="font-bold text-2xl text-darker">
                My Cart
              </Text>
            </View>

            <FlatList 
              data={cart}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <View key={item.color.id} className="mb-4">
                  <CartCardProduct 
                    id={item.id}
                    name={item.name}
                    price={item.price}
                    rating={item.rating}
                    quantity={item.quantity}
                    image={item.image}
                    color={item.color}
                  />
                </View>
              )}
              showsVerticalScrollIndicator={false}
            />
          
            <View className="w-full my-6">
              <View className="w-full flex-row items-center justify-between mb-4">
                <Text className="font-bold text-lg text-darker">
                  Total: {''}
                  <Text className="font-medium text-lg text-darker">
                    {itemCount === 1 && `${itemCount} item`}

                    {itemCount > 1 && `${itemCount} itens`}
                  </Text>
                </Text>

                <Text className="font-bold text-xl text-darker">
                  R$ {totalPrice.toFixed(2)}
                </Text>
              </View>

              <View className="w-full h-[48px]">
                <Link href="/checkout/address" asChild>
                  <Button title="Ir para Checkout" />
                </Link>
              </View>
            </View>
          </View>
        )}

        {cart.length === 0 && (
          <View className="flex-1 items-center justify-center">
            <MaterialIcons name="shopping-cart" size={100} color="#E7E7E7" />
            
            <Text className="font-bold text-2xl mt-4 text-darker text-center">
              Nenhum item
            </Text>

            <Text className="font-sans text-base mt-4 text-center max-w-[320px]">
              Oh não! Seu carrinho está vazio. Preencha-o com brindes para concluir sua compra.
            </Text>

            <View className="w-[164px] h-[48px] mt-4">
              <Link href="/home" asChild>
                <Button
                  title="Conferir produtos"
                />
              </Link>
            </View>
          </View>
        )}       
      </ImageBackground>
    </SafeAreaView>
  )
}