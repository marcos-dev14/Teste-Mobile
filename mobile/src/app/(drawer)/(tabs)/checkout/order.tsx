import { Alert, FlatList, SafeAreaView, ScrollView, Text, View } from "react-native"
import { router } from "expo-router"
import { useMutation, useQuery } from "@tanstack/react-query"

import { useCart } from "@/context/cart-context"
import { useUser } from "@/context/user-context"

import { createOrder } from "@/api/order"
import { getAddressByUserId } from "@/api/address"

import { Header } from "@/components/header"
import { CartCardProduct } from "@/components/cart-card-product"
import { Button } from "@/components/button"

import { colors } from "@/styles/theme/colors"

export default function Order() {
  const { cart, totalPrice, clearCart } = useCart()
  const { user } = useUser()

  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0)

  const { data: addressUserData } = useQuery({
    queryKey: ['address-user'],
    queryFn: () => getAddressByUserId(user?.id)
  })

  const { mutateAsync: createOrderMutation } = useMutation({
    mutationFn: createOrder,
    onSuccess: () => {
      clearCart()

      router.replace('/checkout/complete')
    },
    onError: () => {
      Alert.alert('Erro', 'Ocorreu um erro ao finalizar a compra.');
    },
  });

  function handleEndPurchase() {
    const addressData = addressUserData ? addressUserData[0] : undefined

    const formattedData = {
      userId: user?.id,
      addressId: addressData?.id,
      items: cart.map((product) => ({
        productId: product.id, 
        quantity: product.quantity, 
        price: product.price,
      })),
      totalItems: cart.length,
      totalPrice: Number(totalPrice.toFixed(2)),
    }

    createOrderMutation(formattedData)
  }

  return (
    <SafeAreaView style={{ flex: 1, paddingTop: 40, backgroundColor: colors.white }}>
      <Header backButton linkButton="/checkout/payment" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <View className="w-full px-4 mt-6">
          <Text className="font-bold text-2xl text-darker mb-6">
            Checkout
          </Text>

          <Text className="font-semibold text-lg text-darker mb-4">
            Revise seu pedido
          </Text>

          <FlatList 
            data={cart}
            keyExtractor={item => item.id}
            horizontal
            contentContainerStyle={{ paddingRight: 16 }}
            renderItem={({ item }) => (
              <View className="mr-4">
                <CartCardProduct 
                  id={item.id}
                  name={item.name}
                  price={item.price}
                  rating={item.rating}
                  quantity={item.quantity}
                  image={item.image}
                  cardFooter={false}
                  color={item.color}
                />
              </View>
            )}
            showsHorizontalScrollIndicator={false}
          />

          <View className="w-full my-4">
            <Text className="font-semibold text-lg text-darker mb-2">
              Endereço de entrega
            </Text>

            {addressUserData && addressUserData?.length >= 1 && (
              <View className="w-full">
                <Text className="font-sans text-lg text-darker">
                  {addressUserData[0].fullName}
                </Text>

                <View className="flex-row items-center gap-2">
                  <Text className="font-sans text-lg text-darker">
                    {addressUserData[0].addressLine1},
                  </Text>

                  <Text className="font-sans text-lg text-darker">
                    {addressUserData[0].addressLine2}
                  </Text>
                </View>

                <View className="flex-row items-center gap-2">
                  <Text className="font-sans text-lg text-darker">
                    {addressUserData[0].city},
                  </Text>

                  <Text className="font-sans text-lg text-darker">
                    {addressUserData[0].state}
                  </Text>
                </View>

                <View className="flex-row items-center gap-2">
                  <Text className="font-sans text-lg text-darker">
                    {addressUserData[0].country},
                  </Text>

                  <Text className="font-sans text-lg text-darker">
                    {addressUserData[0].zipCode}
                  </Text>
                </View>
              </View>
            )}
          </View>

          <View className="w-full my-4">
            <Text className="font-semibold text-lg text-darker mb-2">
              Métodos de pagamento
            </Text>

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
          </View>

          <View className="w-full h-[48px]">
            <Button 
              title="Fazer pedido" 
              onPress={handleEndPurchase}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}