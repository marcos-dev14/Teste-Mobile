/* eslint-disable @typescript-eslint/no-require-imports */
// Setup global dos testes (jest-expo): substitui módulos nativos por equivalentes em memória.

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
)

jest.mock('@react-native-community/netinfo', () => require('@react-native-community/netinfo/jest/netinfo-mock.js'))

jest.mock('expo-secure-store', () => {
  const store = new Map<string, string>()
  return {
    getItemAsync: jest.fn(async (key: string) => store.get(key) ?? null),
    setItemAsync: jest.fn(async (key: string, value: string) => void store.set(key, value)),
    deleteItemAsync: jest.fn(async (key: string) => void store.delete(key)),
    __reset: () => store.clear(),
  }
})

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(async () => {}),
  selectionAsync: jest.fn(async () => {}),
  notificationAsync: jest.fn(async () => {}),
  ImpactFeedbackStyle: { Light: 'light' },
  NotificationFeedbackType: { Success: 'success', Error: 'error' },
}))

jest.mock('expo-crypto', () => ({ randomUUID: () => require('crypto').randomUUID() }))

require('react-native-reanimated').setUpTests()

// O automock do jest-expo 52 não implementa ExpoFontLoader.getLoadedFonts como array; ícones viram texto simples.
jest.mock('@expo/vector-icons/Ionicons', () => {
  const { Text } = require('react-native')
  const Icon = ({ name }: { name: string }) => <Text>{`icon:${name}`}</Text>
  return { __esModule: true, default: Icon }
})
