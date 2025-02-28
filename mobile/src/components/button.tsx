import { TouchableOpacity, TouchableOpacityProps, Text, View } from "react-native"
import { LinearGradient } from 'expo-linear-gradient'

interface ButtonProps extends TouchableOpacityProps {
  title: string
  type?: 'primary' | 'secondary' | 'tertiary' | 'danger'
}

export function Button({ title, type = 'primary', ...rest }: ButtonProps) {
  return (
    <View className="w-full h-[48px]">
      {type === 'primary' && (
        <LinearGradient
          colors={['#6AC9FF', '#28CE9C']} 
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="flex-1 w-full max-h-[48px] items-center justify-center overflow-hidden"
          style={{ borderRadius: 36 }}
        >
          <TouchableOpacity
            activeOpacity={0.4}
            className="w-full h-full items-center justify-center"
            {...rest}
          >
            <Text className="font-semibold text-lg text-darker">
              {title}
            </Text>
          </TouchableOpacity>
        </LinearGradient>
      )}

      {type === 'secondary' && (
        <TouchableOpacity
          activeOpacity={0.4}
          className="w-full h-full items-center justify-center bg-transparent border border-green rounded-full"
          {...rest}
        >
          <Text className="font-semibold text-lg text-darker">
            {title}
          </Text>
        </TouchableOpacity>
      )}

      {type === 'tertiary' && (
        <TouchableOpacity
          activeOpacity={0.4}
          className="w-full h-full items-center justify-center bg-transparent border border-darker rounded-full"
          {...rest}
        >
          <Text className="font-semibold text-lg text-darker">
            {title}
          </Text>
        </TouchableOpacity>
      )}


      {type === 'danger' && (
        <TouchableOpacity
          activeOpacity={0.4}
          className="w-full h-full items-center justify-center bg-transparent border border-red rounded-full"
          {...rest}
        >
          <Text className="font-semibold text-lg text-red">
            {title}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  )
}