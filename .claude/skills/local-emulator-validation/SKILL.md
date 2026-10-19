---
name: local-emulator-validation
description: Como subir banco, API e app e validar no emulador Android local (Windows, Expo Go SDK 52) — endereços de rede corretos, variáveis de ambiente, checagem de conectividade e troubleshooting. Use ao executar o projeto localmente ou validar um fluxo no emulador.
---

# Validação no emulador local

Ambiente de referência: Windows 11, Node 24, Docker Desktop, Android SDK em `C:\Android\Sdk`, AVD **`Rentx_API30`** (Android 11, x86_64).

> O AVD `Barber_App` usa imagem Android 37 com páginas de 16 KB (`ps16k`). As bibliotecas nativas do Expo Go SDK 52 (RN 0.76) não são alinhadas a 16 KB → use o `Rentx_API30` (ou outro AVD com imagem de 4 KB).

## Subida
```powershell
# 1. Banco
cd server; docker compose up -d; docker compose ps   # status healthy
# 2. API
copy .env.example .env      # primeira vez; gere JWT_SECRET (ver README)
npm install; npm run db:migrate; npm run db:seed; npm run dev
# 3. Emulador
& "$env:ANDROID_HOME\emulator\emulator.exe" -avd Rentx_API30
# 4. App
cd ..\mobile; npm install; npx expo start --android
```

## Rede
| De onde | URL da API |
|---|---|
| Navegador/curl no host | `http://127.0.0.1:3333` |
| Emulador Android | `http://10.0.2.2:3333` (alias do host) **ou** IP de LAN do host |
| Dispositivo físico | IP de LAN do host (mesma rede; firewall liberando a porta 3333) |

O app resolve automaticamente (`mobile/src/lib/env.ts`): `EXPO_PUBLIC_API_URL` → host do Metro → `10.0.2.2`. A API escuta em `0.0.0.0` (`HOST` no `.env`). Cleartext HTTP é permitido no Expo Go em desenvolvimento.

## Checagem de conectividade
1. Host: `curl http://127.0.0.1:3333/health/ready` → `{"status":"ok","db":"ok"}`.
2. Emulador (a imagem Android 11 não tem `curl`; use o `nc` do toybox):
   ```bash
   adb shell "printf 'GET /health HTTP/1.0\r\n\r\n' | nc -w 3 10.0.2.2 3333"
   ```
   → `HTTP/1.1 200 OK` … `{"status":"ok"}`. No Git Bash, prefixe com `MSYS_NO_PATHCONV=1` comandos `adb` que usam caminhos como `/sdcard`.
3. App: tela inicial lista produtos; o log da API mostra `GET /v1/products` com `statusCode 200`.

## Troubleshooting
| Sintoma | Causa provável | Ação |
|---|---|---|
| "Não foi possível conectar" no app | API parada ou ouvindo em 127.0.0.1 | `HOST=0.0.0.0` no `.env`; reinicie |
| Funciona no emulador, não no celular | firewall do Windows | liberar porta 3333 para rede privada |
| `ECONNREFUSED 127.0.0.1:5442` | container parado | `docker compose up -d` |
| Expo Go fecha ao abrir | AVD 16 KB | usar `Rentx_API30` |
| Bundle antigo/cache | cache do Metro | `npx expo start -c` |

## Validação
Checagens 1–3 OK e roteiro da skill `integration-and-e2e-testing` executado; resultados registrados em `docs/05-execucao-local.md`.
