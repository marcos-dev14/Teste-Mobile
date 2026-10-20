# 01 — Relatório de auditoria do projeto original

> Escopo: estado do repositório no commit `2aba394` (branch `main`), antes da reengenharia.
> Data: 2026-10-19. Todas as evidências abaixo foram verificadas no código ou executadas.

Legenda de tipo:
**[C]** problema comprovado no código ou por execução · **[R]** risco potencial · **[M]** recomendação de melhoria.

---

## 1. Inventário

| Item | Encontrado |
|---|---|
| Backend | NestJS 11 + Express, Prisma 6.4, `class-validator`, `bcrypt` 5 |
| Banco | PostgreSQL (imagem `bitnami/postgresql`, sem volume persistente) |
| Mobile | Expo SDK 52, React Native 0.76.7, Expo Router 4, NativeWind 4, React Query 5, RHF + Zod 3, Axios, AsyncStorage, Skia, expo-camera |
| Testes backend | 5 suítes / 21 testes unitários, **todos com Prisma mockado** (executados: 21/21 passam) |
| Testes mobile | `jest-expo` configurado, **nenhum teste** |
| Typecheck mobile | `tsc --noEmit` → **3 erros** (`drawing.tsx:14`, `login.tsx:83`, `login.tsx:95`) |
| Dependências | `npm audit` (lockfile): server 5 críticas / 61 altas; mobile 4 críticas / 82 altas |

### Funcionalidades realmente existentes
- Splash fixo de 2 s → login (`mobile/src/app/index.tsx:13`).
- Login e cadastro (sem token; apenas grava `{id,name,email}` no AsyncStorage).
- Catálogo em grade com busca por nome **no cliente**.
- Detalhe do produto com variação de cor (galeria por cor), quantidade e "adicionar ao carrinho".
- Carrinho persistido localmente (alterar quantidade, remover).
- Checkout em 3 telas: endereço → "pagamento" (formulário de cartão **descartado**, nada é enviado) → revisão → concluído.
- Backend: `GET /orders/user/:userId` existe, mas **não há tela de pedidos** no app.
- Telas herdadas de um template de testes ("My Demo App"): QR Code scanner, desenho com Skia, "Sobre", menu lateral com itens sem ação ("Reset App State", "API Calls", "Report a Bug").

Não existem: categorias, favoritos, estoque, histórico de pedidos no app, perfil, recuperação de senha, papéis de usuário.

---

## 2. Problemas encontrados

### 2.1 Segurança

| # | Crit. | Tipo | Problema | Evidência |
|---|---|---|---|---|
| S1 | **Crítica** | [C] | **Não existe autenticação.** O login só retorna os dados do usuário; nenhuma rota exige credencial. A identidade é o `userId` enviado pelo cliente. | `server/src/auth/auth.controller.ts` (sem token); `order.controller.ts`, `address.controller.ts` sem guard |
| S2 | **Crítica** | [C] | **IDOR total**: qualquer pessoa lista pedidos e endereços de qualquer usuário, e cria pedidos/endereços em nome de outro. | `GET /order/user/:userId`, `GET /address/user/:userId`, `GET /address/:id`, `POST /order` com `userId` no corpo |
| S3 | **Crítica** | [C] | **Vazamento do hash de senha**: `POST /users/register` retorna o registro Prisma completo; `GET /users/:id` (público) retorna usuário + `password` + endereços. | `server/src/users/users.service.ts:24`, `users.controller.ts:14` |
| S4 | **Crítica** | [C] | **Preço e total definidos pelo cliente**: o servidor grava `items[].price`, `totalItems` e `totalPrice` exatamente como recebidos. É possível comprar qualquer coisa por R$ 0,01. | `server/src/order/order.service.ts:21-25`; `mobile/.../checkout/order.tsx:45-52` |
| S5 | **Crítica** | [C] | **Operações administrativas públicas**: `POST /products` cria produtos e `PATCH /products/:id/rating` altera avaliação, sem autenticação. | `server/src/products/products.controller.ts:17,36` |
| S6 | Alta | [C] | Pedido aceita `addressId` de outro usuário: a checagem só verifica se o usuário tem *algum* endereço (`findFirst`), não se o `addressId` lhe pertence. | `order.service.ts:11-13` |
| S7 | Alta | [C] | Itens do pedido não validam existência do produto, quantidade positiva/inteira nem limite (`@IsNumber` aceita `-5` e `1.5`). | `order/dto/order-item.dto.ts` |
| S8 | Alta | [C] | Credenciais de demonstração embutidas no app e exibidas na tela de login. | `mobile/src/app/login.tsx:64-65,200,214` |
| S9 | Alta | [C] | Sem rate limiting: login sujeito a força bruta e cadastro a abuso. | `server/src/main.ts` |
| S10 | Alta | [C] | Erros internos vazam como 500 genérico ou mensagem crua: `throw new Error(...)` em vez de exceções HTTP; produto inexistente vira 500. Duplicidade de e-mail também vira 500. | `products.service.ts:77`, `users.service.ts:18`, `address.service.ts:58` |
| S11 | Média | [C] | Política de senha inconsistente: backend aceita qualquer senha não vazia; mobile exige 6 com mensagem dizendo 8. | `users/dto/create-user.dto.ts`, `mobile/src/schemas/login-form-schema.ts` |
| S12 | Média | [C] | Formulário coleta número de cartão e CVV sem qualquer processamento (dado sensível coletado sem finalidade; risco PCI se fosse persistido). | `mobile/.../checkout/payment.tsx` |
| S13 | Média | [C] | Sessão em AsyncStorage (não criptografado). Hoje só guarda o perfil, mas o padrão levaria tokens para armazenamento inseguro. | `mobile/src/storage/user-storage.ts` |
| S14 | Média | [C] | Sem CORS explícito, sem cabeçalhos de segurança, sem limite de tamanho de corpo definido, sem logs estruturados. | `server/src/main.ts` |
| S15 | Média | [C] | Dependências com vulnerabilidades conhecidas (inclui `axios` em runtime no app, `bcrypt`/`tar` no server). | `npm audit --package-lock-only` |
| S16 | Baixa | [C] | Permissões de câmera e microfone (`recordAudioAndroid: true`) declaradas para uma funcionalidade fora do escopo de e-commerce. | `mobile/app.json` |
| S17 | Baixa | [C] | Credenciais do banco fixas (`docker:docker`) e imagem `bitnami/postgresql` sem tag fixa. | `server/docker-compose.yml` |

### 2.2 Integridade de dados e persistência

| # | Crit. | Tipo | Problema | Evidência |
|---|---|---|---|---|
| D1 | Alta | [C] | Valores monetários em `DOUBLE PRECISION` (`Float`): erros de arredondamento em somas. | `schema.prisma` (`price Float`, `totalPrice Float`) |
| D2 | Alta | [C] | Itens do pedido em `JSONB` **duplamente serializado** (`JSON.stringify` grava uma *string* JSON dentro do JSONB): sem integridade referencial, sem consulta por produto, sem snapshot de nome/cor. | `order.service.ts:23`, leitura com `JSON.parse` |
| D3 | Alta | [C] | `totalItems` gravado como `cart.length` (número de linhas), não soma de quantidades — divergente do que a UI mostra. | `checkout/order.tsx:51` vs `cart.tsx:16` |
| D4 | Média | [C] | Sem índices em chaves estrangeiras (`Address.userId`, `Order.userId`, `ProductColor.productId`). | migrations Prisma |
| D5 | Média | [C] | Sem `CHECK` (preço ≥ 0, rating 0–5, hex válido), sem estoque, sem transação no pedido. | migrations |
| D6 | Média | [C] | Seed não idempotente para produtos (duplica catálogo a cada execução) e com dados inconsistentes (cor "Vermelho" com hex `#FFFFFF`, "Preto" com `#ADD8E6`). | `server/seed.ts` |
| D7 | Baixa | [C] | Migrations com história errática (add/remove `rating` na tabela errada). | `prisma/migrations/2025022614*` |
| D8 | Baixa | [C] | `docker-compose` sem volume: dados somem ao recriar o container. | `server/docker-compose.yml` |

### 2.3 Arquitetura e código — backend

| # | Crit. | Tipo | Problema |
|---|---|---|---|
| A1 | Média | [C] | `PrismaService` instanciado como provider em cada módulo → múltiplos pools de conexão. |
| A2 | Média | [C] | Mapeamento entidade→DTO copiado 4× em `products.service.ts` e 3× em `address.service.ts`. |
| A3 | Média | [C] | Sem contrato de erro padronizado; respostas heterogêneas (`{user, message}`, entidades cruas, `number | null`). |
| A4 | Baixa | [C] | Rotas inconsistentes (`/users/login` no `AuthController`, singulares `/order`, `/address`). |
| A5 | Baixa | [C] | Configuração por ambiente inexistente (só `DATABASE_URL`; `PORT` implícito). |
| A6 | Média | [C] | Testes só verificam que o mock do Prisma foi chamado — não detectariam nenhum dos problemas S1–S7. |

### 2.4 Arquitetura e código — mobile

| # | Crit. | Tipo | Problema | Evidência |
|---|---|---|---|---|
| M1 | Alta | [C] | URL da API fixa em IP de LAN de outra máquina; não funciona no emulador sem editar código. | `mobile/src/lib/axios.ts:5` |
| M2 | Alta | [C] | 3 erros de TypeScript; tela de desenho quebrada (tipos inexistentes, `setPaths` com objeto incompatível). | `tsc --noEmit` |
| M3 | Média | [C] | Splash com espera artificial de 2 s, sem checar sessão. | `app/index.tsx:13` |
| M4 | Média | [C] | Busca filtra a partir da lista já filtrada (`handleSearch` usa `filteredData`), ficando "presa" ao apagar caracteres até o `useEffect` corrigir; estado derivado duplicado. | `home.tsx:27-35` |
| M5 | Média | [C] | Estado vazio da lista invertido: a mensagem "Nenhum produto encontrado" só aparece se `filteredData.length > 1`, ou seja, nunca. | `home.tsx:98` |
| M6 | Média | [C] | Sem estados de erro em nenhuma query; carregamento só no detalhe; falha de rede deixa tela em branco. | todas as telas |
| M7 | Média | [C] | Galeria do produto renderiza todas as imagens empilhadas em `<Image>` sem cache; `Image` do RN sem placeholder. | `product/[id].tsx` |
| M8 | Média | [C] | Contexto de carrinho único: toda alteração re-renderiza todos os consumidores (incl. tab bar). `Alert.alert` em regra de negócio dentro do contexto. | `context/cart-context.tsx` |
| M9 | Média | [C] | Remover último item com "−" dispara confirmação **e** já atualiza para quantidade 0 antes da resposta. | `cart-card-product.tsx:104-108` |
| M10 | Média | [C] | Checkout usa sempre `addressUserData[0]`, ignorando o endereço recém-criado ou escolhido; query sem `userId` na chave de cache (dados de outro usuário após troca de conta). | `checkout/order.tsx:41`, `checkout/address.tsx:43` |
| M11 | Baixa | [C] | Preços sem formatação monetária (`R$ 29.99`, `R$ 59.9`). | `card-product.tsx:36` |
| M12 | Baixa | [C] | Navegação mista Drawer + Tabs com rotas ocultas (`href: null`) para quase tudo; back de cabeçalho por link fixo, não por histórico. | `(tabs)/_layout.tsx` |
| M13 | Baixa | [C] | Link "Já possui uma conta? Clica aqui" aponta para `/register` (ele mesmo). | `register.tsx:150` |
| M14 | Baixa | [C] | `SafeAreaView` do RN com `paddingTop: 40` fixo em todas as telas (não respeita notch/insets no Android). | todas as telas |

### 2.5 UX, acessibilidade e responsividade

| # | Crit. | Tipo | Problema |
|---|---|---|---|
| U1 | Alta | [C] | Nenhum `accessibilityLabel`/`accessibilityRole` em botões de ícone (filtro, +/−, voltar, cores). |
| U2 | Média | [C] | Larguras fixas (`w-[171px]`, `w-[211px]`, `h-[358px]`) quebram em telas estreitas (< 360 dp) e desperdiçam espaço em tablets. |
| U3 | Média | [C] | Áreas de toque < 44 dp (bolinhas de cor 24 dp, ícones 25 dp com `p-1`). |
| U4 | Média | [C] | Feedback por `Alert.alert` modal a cada adição ao carrinho, interrompendo o fluxo. |
| U5 | Média | [C] | Mistura de idiomas ("My Cart", "Test Flows", "Log Out") e textos de template ("chegará tão rápido quanto o pônei galopa"). |
| U6 | Baixa | [C] | Fonte declarada na tab bar (`Poppins_400Regular`) não está carregada. |
| U7 | Baixa | [R] | Contraste do texto `#132322` sobre gradiente claro do botão primário é adequado, mas o estado desabilitado não muda visualmente. |

### 2.6 Performance

| # | Crit. | Tipo | Problema |
|---|---|---|---|
| P1 | Média | [C] | `GET /products` sem paginação e com `include colors` de todos os produtos. Aceitável com 7 itens; não escala. |
| P2 | Baixa | [C] | Sem N+1 no backend (Prisma `include` faz 2 consultas) — **não é problema hoje**. |
| P3 | Média | [C] | Bundle carrega Skia (~vários MB nativos) e expo-camera só para telas de demonstração. |
| P4 | Baixa | [C] | `renderItem` inline sem memoização; `keyExtractor` com `.toString()` redundante. Irrelevante com 7 itens. |

---

## 3. Conclusões que orientam a nova versão

1. **Segurança é o problema dominante**: a API atual não tem autenticação e confia no cliente para identidade e preço. A reconstrução começa pelo contrato de autenticação e pela regra "o servidor calcula tudo".
2. **Modelo de dados precisa de correção estrutural** (dinheiro em centavos inteiros, itens de pedido relacionais com snapshot, estoque por variação, índices e constraints) — a troca do Prisma é a oportunidade natural.
3. **O mobile é refeito**, preservando os fluxos funcionais (catálogo, detalhe com cores, carrinho, checkout com endereço, conclusão) e removendo telas de template sem relação com e-commerce (QR Code, desenho, "Sobre" do template), o que também elimina Skia e as permissões de câmera/microfone.
4. Funcionalidades que **já existiam no backend sem tela** (histórico de pedidos) passam a ter tela. Funcionalidades inexistentes (favoritos, categorias, recuperação de senha) ficam como propostas em `docs/06-pendencias-e-futuro.md`.

A arquitetura e o plano estão em [02-arquitetura.md](02-arquitetura.md).
