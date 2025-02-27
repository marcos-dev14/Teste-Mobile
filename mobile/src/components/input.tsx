import { colors } from "@/styles/theme/colors"
import { TextInput, TextInputProps, View, Text } from "react-native"

interface InputPros extends TextInputProps {
  label?: string
  error?: boolean
}

export function Input({ label, error = false, ...rest }: InputPros) {
  return (
    <View className="w-full"
      style={{
        borderBottomWidth: 2,
        borderColor: error ? colors.red : colors.light,
        height: 76
      }}
    >
      {label && 
        <Text className="font-semibold text-base text-darker uppercase">
          {label}
        </Text>
      }
      <TextInput {...rest} className="font-sans text-darker text-base px-2" />
    </View>
  )
}