import { View, Text, TouchableOpacity, type TouchableOpacityProps } from "react-native"
import { MaterialCommunityIcons } from "@expo/vector-icons"

import { colors } from "@/styles/theme/colors"

interface CheckboxProps extends TouchableOpacityProps {
  checked: boolean;
  text?: string;
}

export function Checkbox({
  checked,
  text = "",
 ...rest
}: CheckboxProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.4}
      className="flex-row items-start justify-start"
      {...rest}
    >
      <View  style={{
        width: 24,
        height: 24,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: checked ? colors.darkBlue : colors.light,
        backgroundColor: checked ? colors.darkBlue : "transparent",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 8,
      }}>
        {checked && 
          <MaterialCommunityIcons 
            name="check" 
            size={18} 
            color={colors.white} 
          />
        }
      </View>

      <Text className="font-sans text-base text-darker">
        {text}
      </Text>
    </TouchableOpacity>
  )
}