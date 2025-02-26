import { CardProduct } from '@/components/card-product';
import { Header } from '@/components/header'
import { StartRating } from '@/components/start-rating';
import { colors } from '@/styles/theme/colors'
import { Ionicons } from '@expo/vector-icons'
import { Link } from 'expo-router';
import { View, Text, SafeAreaView, TouchableOpacity, FlatList, Image } from 'react-native'

export default function Index() {
  const products = [
    {
      id: 1,
      name: 'Swag Labs Backpack',
      price: '$29.99',
      image: '',
      rating: 3.5,
    },
    {
      id: 2,
      name: 'Swag Labs Bike Light',
      price: '$9.99',
      image: '',
      rating: 3.5,
    },
    {
      id: 3,
      name: 'Swag Labs Bolt T-Shirt',
      price: '$15.99',
      image: '',
      rating: 3.5,
    },
    {
      id: 4,
      name: 'Swag Labs Fleece Jacket',
      price: '$59.99',
      image: '',
      rating: 3.5,
    },
    {
      id: 5,
      name: 'Swag Labs Onesie',
      price: '$19.99',
      image: '',
      rating: 3.5,
    },
    // {
    //   id: 5,
    //   name: 'Swag Labs Onesie',
    //   price: '$19.99',
    //   image: '',
    // },
  ];

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
          data={products}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ paddingTop: 10, paddingBottom: 40 }}
          numColumns={2}
          columnWrapperStyle={{ width: '100%', justifyContent: 'space-between', gap: 16, }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <Link key={item.id} href={`/product/${item.id}`} asChild>
              <CardProduct 
                title={item.name}
                price={item.price}
                productImage={item.image}
                rating={item.rating}
              />
            </Link>
          )}
        />
      </View>
    </SafeAreaView>
  )
}