# 05 — Execução local e validação no emulador

Ambiente validado: Windows 11, Node 24.14, Docker Desktop 29, Android SDK em `C:\Android\Sdk`, AVD `Barber_App` (Android 17) e `Rentx_API30` (Android 11), Expo Go 57.0.9 (SDK 57). No iPhone, use o Expo Go da App Store (só a versão mais recente é suportada).

## Pré-requisitos
| Ferramenta | Versão mínima | Verificação |
|---|---|---|
| Node.js | 22.12 | `node -v` |
| Docker Desktop | em execução | `docker info` |
| Android SDK + emulador | AVD com imagem de páginas de **4 KB** | `emulator -list-avds` |

> **Prefira um AVD recente (`Barber_App`, Android 17).** Com o SDK 57 as imagens de 16 KB funcionam. No `Rentx_API30` (Android 11) o app roda, mas o Expo Go 57 pinta a barra de status de preto (ícones escuros somem); é comportamento do Expo Go nessa imagem — no Android 17 o edge-to-edge aparece correto.

## 1. Banco de dados
```powershell
cd server
docker compose up -d          # container mp-ecommerce-postgres em 127.0.0.1:5442 (só loopback)
docker compose ps             # STATUS deve ser "healthy"
```
O primeiro `up` também cria o banco `ecommerce_test` (script em `server/db/init/`). O volume `mp-ecommerce_pgdata` persiste os dados.

## 2. API
```powershell
cd server
copy .env.example .env
# Gere um segredo e coloque em JWT_SECRET no .env:
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
npm install
npm run db:migrate            # aplica migrations pendentes (idempotente)
npm run db:seed               # catálogo + usuário demo (idempotente; recusado em produção)
npm run dev                   # http://0.0.0.0:3333
```
Usuário de demonstração (somente desenvolvimento): `demo@vesti.dev` / `vesti1234`.

Verificação: `curl http://127.0.0.1:3333/health/ready` → `{"status":"ok","db":"ok"}`.

## 3. Emulador
```powershell
& "$env:ANDROID_HOME\emulator\emulator.exe" -avd Barber_App
adb devices                   # emulator-5554  device
```
Verifique se o emulador alcança a API do host (a imagem Android 11 não tem `curl`):
```bash
adb shell "printf 'GET /health HTTP/1.0\r\n\r\n' | nc -w 3 10.0.2.2 3333"   # HTTP/1.1 200 OK
```

## 4. App
```powershell
cd mobile
npm install
npx expo start                # depois pressione "a" para abrir no emulador
```
Na primeira vez, o Expo CLI instala o Expo Go compatível com o SDK 57 no emulador (o APK oficial também está em `https://api.expo.dev/v2/versions/latest` → `sdkVersions["57.0.0"].androidClientUrl`). Se o terminal não for interativo, abra diretamente:
```bash
adb shell am start -a android.intent.action.VIEW -d "exp://<IP-da-máquina>:8081" host.exp.exponent
```

### Como o app encontra a API
`mobile/src/lib/env.ts` resolve, nesta ordem:
1. `EXPO_PUBLIC_API_URL` (opcional, em `mobile/.env`; veja `.env.example`);
2. o IP da máquina que serve o Metro (ex.: `http://192.168.0.104:3333`), que funciona no emulador e no celular;
3. `http://10.0.2.2:3333` no emulador Android (alias do host; `localhost` no emulador é o próprio emulador).

Em modo de desenvolvimento, a URL efetiva aparece no rodapé da aba **Perfil**.

## 5. Testes
```powershell
cd server; npm run typecheck; npm run lint; npm test     # usa somente o banco ecommerce_test
cd mobile; npm run typecheck; npm run lint; npm test
```

## 6. Roteiro ponta a ponta executado (2026-10-19)
| # | Passo | Resultado |
|---|---|---|
| 1 | Abrir app → Início | Catálogo carregado da API (7 peças), imagens, preços em BRL, avaliação |
| 2 | Abrir "Calça Jeans Reta" | Cor "Preto Lavado" marcada como esgotada (rótulo acessível "Preto Lavado, esgotado") |
| 3 | Quantidade 2 → Adicionar à sacola | Toast com ação "Ver sacola"; badge da aba = 2 |
| 4 | Sacola | Totais da cotação do servidor: 2 × R$ 89,99 = R$ 179,98; frete grátis |
| 5 | "Entrar para finalizar" → senha errada | "E-mail ou senha incorretos." (mensagem genérica) |
| 6 | Senha correta | Retorno automático ao checkout (etapa Entrega) |
| 7 | Cadastrar endereço (máscara de CEP, foco encadeado) | Salvo; avança para Pagamento |
| 8 | Cartão de crédito → Revisar → Confirmar | Pedido **#1001** criado; no banco: `credit_card`, 2 itens, 17998 centavos; estoque 10 → 8 |
| 9 | Ver detalhes → Voltar | Detalhe com snapshot; "voltar" leva às abas (não retorna ao checkout); sacola vazia |
| 10 | Reiniciar o app | Sessão restaurada sem rede ("Olá, Cliente"); sacola persistida |
| 11 | Tema escuro do sistema | Todas as telas visitadas seguem os tokens escuros |
| 12 | Parar a API → buscar "bolsa" | Estado "Sem conexão" + "Tentar novamente" |
| 13 | Religar a API → Tentar novamente | 1 resultado para "bolsa" |

Achados desta validação, todos corrigidos no commit `cd892f8`: título grande desalinhado em telas com margem; conteúdo do detalhe do produto passando sob a status bar; toast com ação curto demais (3 s → 5 s).

## Troubleshooting
| Sintoma | Causa provável | Ação |
|---|---|---|
| App mostra "Sem conexão" | API parada ou ouvindo só em 127.0.0.1 | `npm run dev` com `HOST=0.0.0.0` no `.env` |
| Funciona no emulador e não no celular | Firewall do Windows | Liberar a porta 3333 para rede privada |
| `ECONNREFUSED 127.0.0.1:5442` | Container parado | `docker compose up -d` |
| "Project is incompatible with this version of Expo Go" | Expo Go de outro SDK | Instalar o Expo Go do SDK 57 (Android) ou atualizar o app (iOS) |
| `Port 8081 is being used` | Metro anterior ainda aberto | Encerrar o processo `expo start` antigo |
| `expo start --android` para pedindo confirmação | Atualização sugerida do Expo Go em terminal não interativo | `npx expo start` e pressionar `a`, ou abrir via `adb ... exp://` |
| Bundle antigo | Cache do Metro | `npx expo start -c` |
