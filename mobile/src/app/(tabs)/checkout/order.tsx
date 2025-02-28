import { FlatList, SafeAreaView, ScrollView, Text, View } from "react-native"
import { router } from "expo-router"

import { useCart } from "@/context/cart-context"

import { Header } from "@/components/header"
import { CartCardProduct } from "@/components/cart-card-product"
import { Button } from "@/components/button"

import { colors } from "@/styles/theme/colors"
import { useQuery } from "@tanstack/react-query"
import { getAddressByUserId } from "@/api/address"
import { useUser } from "@/context/user-context"

export default function Order() {
  const { cart, totalPrice } = useCart()
  const { user } = useUser()

  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0)

  const { data: addressUserData } = useQuery({
    queryKey: ['address-user'],
    queryFn: () => getAddressByUserId(user?.id)
  })

  function handlePlaceOrder() {
    if (!addressUserData) {
      return router.replace('/(tabs)/checkout/address')
    }

    router.replace('/checkout/payment')
  }

  return (
    <SafeAreaView style={{ flex: 1, paddingTop: 40, backgroundColor: colors.white }}>
      <Header backButton linkButton="/cart" />

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
                />
              </View>
            )}
            showsHorizontalScrollIndicator={false}
          />

          <View className="w-full my-4">
            <Text className="font-semibold text-lg text-darker mb-2">
              Endereço de entrega
            </Text>

            {addressUserData && (
              <>
                {addressUserData?.map((address, index) => (
                  <View key={index} className="w-full">
                    <Text className="font-sans text-lg text-darker">
                      {address.fullName}
                    </Text>

                    <View className="flex-row items-center gap-2">
                      <Text className="font-sans text-lg text-darker">
                        {address.addressLine1},
                      </Text>

                      <Text className="font-sans text-lg text-darker">
                        {address.addressLine2}
                      </Text>
                    </View>

                    <View className="flex-row items-center gap-2">
                      <Text className="font-sans text-lg text-darker">
                        {address.city},
                      </Text>

                      <Text className="font-sans text-lg text-darker">
                        {address.state}
                      </Text>
                    </View>

                    <View className="flex-row items-center gap-2">
                      <Text className="font-sans text-lg text-darker">
                        {address.country},
                      </Text>

                      <Text className="font-sans text-lg text-darker">
                        {address.zipCode}
                      </Text>
                    </View>
                  </View>
                ))}
              </>
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
              onPress={handlePlaceOrder}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}