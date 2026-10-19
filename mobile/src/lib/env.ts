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

/** Em build de release a API precisa ser HTTPS (HTTP só no desenvolvimento local). */
export function assertSecureInRelease(url: string, isDev: boolean): string {
  if (!isDev && !url.startsWith('https://')) {
    throw new Error('EXPO_PUBLIC_API_URL deve usar https:// em builds de release.')
  }
  return url
}

export const env = {
  apiUrl: assertSecureInRelease(
    resolveApiUrl({
      explicit: process.env.EXPO_PUBLIC_API_URL,
      hostUri: Constants.expoConfig?.hostUri,
      platform: Platform.OS,
    }),
    __DEV__,
  ),
  appVersion: Constants.expoConfig?.version ?? '0.0.0',
}
