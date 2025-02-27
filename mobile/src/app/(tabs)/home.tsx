import { View, Text, SafeAreaView, TouchableOpacity, FlatList } from 'react-native'
import { Link } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'

import { getProducts } from '@/api/products'

import { CardProduct } from '@/components/card-product'
import { Header } from '@/components/header'

import { colors } from '@/styles/theme/colors'

export default function Home() {
  const { data: productsData } = useQuery({
    queryKey: ['products'],
    queryFn: () => getProducts()
  })

  return (
    <SafeAreaView style={{ flex: 1, paddingTop: 40, backgroundColor: colors.white }}>
      <Header backButton />

      <View className="flex-1 items-start px-4">
        <View className="w-full h-8 flex-row items-center justify-between my-6">
          <Text className="text-2xl font-sans font-bold text-darker">
            Produtos
          </Text>

          <TouchableOpacity
            className="p-1 items-center justify-center"
            activeOpacity={0.7}
          >
            <Ionicons name="filter" size={20} color={colors.darker} />
          </TouchableOpacity>
        </View>

        <FlatList
          data={productsData}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ paddingTop: 10, paddingBottom: 40 }}
          numColumns={2}
          columnWrapperStyle={{ width: '100%', justifyContent: 'space-between', gap: 16, }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View key={item.id}>
              <Link href={`/product/${item.id}`} asChild>
                <CardProduct 
                  title={item.name}
                  price={item.price}
                  productImage={item.images[0]}
                  rating={item.rating}
                />
              </Link>
            </View>
          )}
        />
      </View>
    </SafeAreaView>
  )
}