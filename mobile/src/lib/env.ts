import Constants from 'expo-constants'
import { Platform } from 'react-native'

const API_PORT = 3333

/**
 * Resolve a URL da API em desenvolvimento local:
 * 1. `EXPO_PUBLIC_API_URL`, se definida;
 * 2. o IP da máquina que serve o Metro (`hostUri`) — funciona no emulador e no dispositivo físico;
 * 3. `10.0.2.2` no emulador Android (alias do host) ou `127.0.0.1` no simulador iOS/web.
 *
 * `localhost` dentro do emulador aponta para o próprio emulador, não para o computador.
 */
export function resolveApiUrl(options: {
  explicit?: string
  hostUri?: string | null
  platform: string
}): string {
  if (options.explicit) return options.explicit.replace(/\/+$/, '')
  const host = options.hostUri?.split(':')[0]
  if (host && host !== 'localhost' && host !== '127.0.0.1') return `http://${host}:${API_PORT}`
  return options.platform === 'android' ? `http://10.0.2.2:${API_PORT}` : `http://127.0.0.1:${API_PORT}`
}

export const env = {
  apiUrl: resolveApiUrl({
    explicit: process.env.EXPO_PUBLIC_API_URL,
    hostUri: Constants.expoConfig?.hostUri,
    platform: Platform.OS,
  }),
  appVersion: Constants.expoConfig?.version ?? '0.0.0',
}
