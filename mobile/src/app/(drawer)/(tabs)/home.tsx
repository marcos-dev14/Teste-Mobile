import { useEffect, useState } from 'react'
import { View, Text, SafeAreaView, TouchableOpacity, FlatList } from 'react-native'
import { Link } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'

import { getProducts } from '@/api/products'

import { CardProduct } from '@/components/card-product'
import { Header } from '@/components/header'
import { SearchFilter } from '@/components/search-filter'

import { colors } from '@/styles/theme/colors'

import type { ProductParams } from '@/types/product'

export default function Home() {
  const [openSearch, setOpenSearch] = useState(false)
  const [filteredData, setFilteredData] = useState<ProductParams[] | undefined>([])
  const [searchQuery, setSearchQuery] = useState("")

  const { data: productsData } = useQuery({
    queryKey: ['products'],
    queryFn: () => getProducts()
  })

  function handleSearch(text: string) {
    setSearchQuery(text)
  
    const filtered = filteredData
    ?.filter((item) =>
      item.name.toLowerCase().includes(text.toLowerCase())
    )

    setFilteredData(filtered)
  }

  useEffect(() => {
    if (productsData) {
      const newData = productsData
        .filter((item) =>
          item.name.toLowerCase().includes(searchQuery.toLowerCase())
        )

      setFilteredData(newData)
    }
  }, [searchQuery, productsData])

  return (
    <SafeAreaView style={{ flex: 1, paddingTop: 40, backgroundColor: colors.white }}>
      <Header backButton />

      <View className="flex-1 px-4">
        <View className="w-full">
          <View className="w-full h-8 flex-row items-center justify-between my-4">
            <Text className="text-2xl font-sans font-bold text-darker">
              Produtos
            </Text>

            <TouchableOpacity
              className="p-1 items-center justify-center"
              activeOpacity={0.7}
              onPress={() => setOpenSearch(!openSearch)}
            >
              <Ionicons name="filter" size={20} color={colors.darker} />
            </TouchableOpacity>
          </View>

          {openSearch && (
            <SearchFilter
              value={searchQuery}
              onChange={handleSearch}
            />
          )}
        </View>

        <FlatList
          data={filteredData}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ paddingTop: 10, paddingBottom: 40 }}
          numColumns={2}
          columnWrapperStyle={{ width: '100%', justifyContent: 'space-between', gap: 16, }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View key={item.id} className="h-[290px] mb-4">
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
          ListEmptyComponent={() => (
            <View className="flex-1 w-full mt-8 items-center max-w-[300px] self-center">
              {filteredData && filteredData?.length > 1 && (
                <Text className="text-lg leading-normal text-darker text-center">
                  Nenhum produto encontrado. Tente buscar por algo diferente!
                </Text>
              )}
            </View>
          )}
        />
      </View>
    </SafeAreaView>
  )
}