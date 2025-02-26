import { TouchableOpacity, TouchableOpacityProps, Text } from "react-native"
import { LinearGradient } from 'expo-linear-gradient'

interface ButtonProps extends TouchableOpacityProps {
  title: string
}

export function Button({ title, ...rest }: ButtonProps) {
  return (
    <LinearGradient
      colors={['#6AC9FF', '#28CE9C']} 
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      className="flex-1 py-3 items-center justify-center overflow-hidden"
      style={{ borderRadius: 36 }}
    >
      <TouchableOpacity
        activeOpacity={0.7}
        className="items-center justify-center bg-transparent"
        {...rest}
      >
        <Text className="font-semibold text-base text-darker">
          {title}
        </Text>
      </TouchableOpacity>
    </LinearGradient>
  )
}