import { View, Text, Image, SafeAreaView, TouchableOpacity } from "react-native"
import { useLocalSearchParams } from "expo-router";
import { colors } from "@/styles/theme/colors";
import { Header } from "@/components/header";
import { StartRating } from "@/components/start-rating";
import { Button } from "@/components/button";
import { Ionicons } from "@expo/vector-icons";

const products = [
  {
    id: 1,
    name: 'Swag Labs Backpack',
    price: '$29.99',
    image: 'https://github.com/marcos-dev14.png',
    description: 'A high-quality backpack for all your adventures.',
    rating: 3.5,
  },
  {
    id: 2,
    name: 'Swag Labs Bike Light',
    price: '$9.99',
    image: 'https://github.com/marcos-dev14.png',
    description: 'A bright and durable bike light for night rides.',
    rating: 3.5,
  },
  {
    id: 3,
    name: 'Swag Labs Bolt T-Shirt',
    price: 'R$15.99',
    image: 'https://github.com/marcos-dev14.png',
    description: 'A comfortable and stylish t-shirt for everyday wear.',
    rating: 3.5,
  },
];

export default function ProductDetails() {
  const { id } = useLocalSearchParams();
  const product = products.find((p) => p.id === Number(id));

  if (!product) {
    return (
      <View>
        <Text>Product not found</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, paddingTop: 40, backgroundColor: colors.white }}>
      <Header 
        backButton
        linkButton="/"
      />

      <View className="px-4 w-full mt-4">
        <View className="w-full items-start">
          <Text className="font-bold text-2xl text-darker mb-2">
            {product.name}
          </Text>

          <StartRating rating={product.rating} />
        </View>

        <Image 
          source={{ uri: product.image }} 
          className="w-full h-[358px] rounded-lg mt-4"
        />
       
        <View className="w-full items-start mt-20">
          <Text className="font-bold text-3xl text-darker">
            {product.price}
          </Text>

          <View className="w-full flex-row items-center justify-between mt-4"> 
            <View className="mr-4 flex-row items-center justify-center">
              <TouchableOpacity
                activeOpacity={0.7}
                className="p-1 items-center justify-center"
              >
                <Ionicons name="remove-circle-outline" size={25} color={colors.darkBlue} />
              </TouchableOpacity>

              <Text className="font-semibold text-base text-darker mx-2">
                1
              </Text>

              <TouchableOpacity
                activeOpacity={0.7}
                className="p-1 items-center justify-center"
              >
                <Ionicons name="add-circle-outline" size={25} color={colors.darkBlue} />
              </TouchableOpacity>
            </View>

            <Button title="Adicionar ao carrinho" />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}