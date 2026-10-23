import { Tabs } from 'expo-router'
import { useEffect, useRef } from 'react'
import { View } from 'react-native'
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withTiming } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useCartCount } from '@/features/cart/store'
import { Icon, makeStyles, Text, useStyles, useTheme, useToast, type IconName } from '@/ui'

function TabIcon({ name, focused }: { name: IconName; focused: boolean }) {
  return <Icon name={focused ? name : (`${name}-outline` as IconName)} size={22} color={focused ? 'text' : 'textMuted'} />
}

/** Ícone da sacola com contador que "pulsa" quando um item é adicionado. */
function CartTabIcon({ focused }: { focused: boolean }) {
  const styles = useStyles(styleFactory)
  const theme = useTheme()
  const count = useCartCount()
  const reduceMotion = useReducedMotion()
  const scale = useSharedValue(1)
  const previous = useRef(count)

  useEffect(() => {
    if (count > previous.current && !reduceMotion) {
      scale.value = withSequence(withTiming(1.15, { duration: theme.motion.duration.fast }), withTiming(1, { duration: theme.motion.duration.base }))
    }
    previous.current = count
  }, [count, reduceMotion, scale, theme])

  const badgeStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))

  return (
    <View>
      <TabIcon name="bag-handle" focused={focused} />
      {count > 0 ? (
        <Animated.View style={[styles.badge, badgeStyle]}>
          <Text variant="overline" color="onAccent" maxFontSizeMultiplier={1}>
            {count > 99 ? '99+' : count}
          </Text>
        </Animated.View>
      ) : null}
    </View>
  )
}

export default function TabsLayout() {
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const count = useCartCount()
  const toast = useToast()
  const tabBarHeight = theme.layout.tabBarHeight + insets.bottom

  // Toasts aparecem acima da tab bar enquanto as abas estão visíveis.
  useEffect(() => {
    toast.setBottomOffset(theme.layout.tabBarHeight)
    return () => toast.setBottomOffset(0)
  }, [toast, theme.layout.tabBarHeight])

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.text,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarLabelStyle: { fontFamily: theme.fonts.medium, fontSize: 11 },
        tabBarStyle: {
          height: tabBarHeight,
          paddingTop: 6,
          paddingBottom: insets.bottom + 6,
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
        },
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Início', tabBarIcon: ({ focused }) => <TabIcon name="home" focused={focused} /> }} />
      <Tabs.Screen name="search" options={{ title: 'Buscar', tabBarIcon: ({ focused }) => <TabIcon name="search" focused={focused} /> }} />
      <Tabs.Screen
        name="cart"
        options={{
          title: 'Sacola',
          tabBarAccessibilityLabel: count > 0 ? `Sacola, ${count} ${count === 1 ? 'item' : 'itens'}` : 'Sacola',
          tabBarIcon: ({ focused }) => <CartTabIcon focused={focused} />,
        }}
      />
      <Tabs.Screen name="profile" options={{ title: 'Perfil', tabBarIcon: ({ focused }) => <TabIcon name="person" focused={focused} /> }} />
    </Tabs>
  )
}

const styleFactory = makeStyles((t) => ({
  badge: {
    position: 'absolute',
    top: -6,
    right: -10,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
}))
