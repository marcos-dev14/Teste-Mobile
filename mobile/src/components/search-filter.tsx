import { View, TextInput, TouchableOpacity } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"

import { colors } from "@/styles/theme/colors"

interface SearchFilterProps {
  value: string | undefined
  onChange: (value: string) => void
}

export function SearchFilter({
  value,
  onChange
}: SearchFilterProps) {
  return (
    <View className="w-full flex-row items-center justify-between px-4 py-1 mb-4 border border-light rounded-lg">
      <TextInput 
        value={value}
        onChangeText={onChange}
        className="flex-1 py-2 text-lg text-darker"
        placeholder="Buscar por nome do produto"
        placeholderTextColor={colors.darker}
      />

        {value && value.length > 0 && (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => onChange("")}
            className="bg-neutral-400 p-1 rounded-full"
          >
            <MaterialIcons
              name="close" 
              size={14}
              color={colors.darker}
            />
          </TouchableOpacity>
        )}

      <TouchableOpacity
        className="p-2 items-center justify-center ml-2"
      >
        <MaterialIcons name="search" size={24} color={colors.darker} />
      </TouchableOpacity>
    </View>
  )
}