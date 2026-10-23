# Plano: endereço por CEP e feedback de "adicionar à sacola"

## 1. Endereço por CEP

### Provedor
| Opção | Prós | Contras | Decisão |
|---|---|---|---|
| **ViaCEP** (`viacep.com.br/ws/{cep}/json/`) | gratuito, sem chave, HTTPS, amplamente usado, resposta pequena | sem SLA; bloqueia uso abusivo; CEP inexistente volta como `200 {"erro": true}` | **Primário** |
| **BrasilAPI** (`brasilapi.com.br/api/cep/v1/{cep}`) | gratuito, sem chave, agrega várias fontes | projeto comunitário, sem SLA | **Fallback** |
| Geocodificação (Google, Mapbox, Nominatim) | coordenadas | chave/custo, envio de endereço a mais um terceiro, sem uso real hoje (frete é fixo) | **Não adotado** |

### App → provedor ou App → API → provedor?
**Pela API** (`GET /v1/addresses/zip-codes/:zipCode`, autenticado):
- **Privacidade**: o provedor recebe só o CEP e o IP do servidor — não o IP do aparelho nem nada que ligue o CEP a uma pessoa.
- **Disponibilidade**: fallback entre provedores e troca de provedor sem publicar nova versão do app.
- **Performance**: cache em memória por CEP (24 h para encontrados, 1 h para não encontrados) compartilhado entre usuários — CEP→logradouro é dado público de referência, não dado pessoal isolado. Consultas simultâneas do mesmo CEP são agrupadas numa só.
- **Limites do provedor**: rate limit da rota (30/min/IP) protege a cota.
- **Custo**: um salto a mais (~ms em rede local).

### Contrato
`GET /v1/addresses/zip-codes/01310100` →
- `200 { zipCode: "01310-100", street: string|null, neighborhood: string|null, city: string, state: "SP" }`
- `400 VALIDATION_ERROR` (não tem 8 dígitos) · `404 ZIP_CODE_NOT_FOUND` · `503 ZIP_CODE_LOOKUP_UNAVAILABLE` (ambos os provedores falharam/expiraram) · `401` sem sessão.

Dados do provedor são **revalidados**: espaços normalizados, tamanhos cortados aos limites do banco, UF aceita só se estiver na lista das 27; cidade ausente → tratado como não encontrado. Nenhum CEP vai para o log.

### Modelo
Migration `0002_address_details.sql` (aditiva, sem reescrever dados): `addresses.number` e `addresses.neighborhood` (nuláveis para endereços antigos). Na criação, `number` (1–10, aceita "S/N") e `neighborhood` passam a ser **obrigatórios**, `state` passa a ser **UF válida**. `addressLine1` passa a ser só o logradouro. A cópia do endereço no pedido (`shipping_address`) inclui os novos campos; pedidos antigos voltam com `null`.

### Comportamento no app
1. Ordem: nome → **CEP** → rua → número + complemento → bairro → cidade + UF → país.
2. Ao completar 8 dígitos: consulta (uma vez por CEP; repetida = cache do React Query, sem rede).
3. Indicador de carregamento no campo de CEP; resultado preenche rua, bairro, cidade e UF **sem sobrescrever o que o usuário digitou** (só campos vazios ou ainda iguais ao último preenchimento automático).
4. Foco vai para "Número".
5. Não encontrado / indisponível / timeout → aviso não bloqueante sob o CEP ("preencha manualmente"); todos os campos continuam editáveis.
6. Resposta que chega depois de o usuário mudar o CEP é descartada.
7. O servidor continua validando tudo no `POST /addresses`.

## 2. Feedback de "adicionar à sacola"

### Restrições encontradas
- A sacola é **local** (Zustand + AsyncStorage): adicionar é síncrono e não falha por rede. Não há atualização otimista nem rollback a fazer; o contador reflete exatamente o estado persistido (`useCartCount`). A disponibilidade real é checada pela cotação do servidor na sacola e de novo no pedido.
- Falhas possíveis hoje: limite de 20 linhas e estoque já todo na sacola — ambas tratadas **antes** de adicionar, com toast informativo e **sem animação de sucesso**.
- Ferramentas já disponíveis: Reanimated 4, `expo-haptics`, tokens de motion (`motion.spring.snappy/gentle`), `useReducedMotion`. **Nenhuma dependência nova.**

### Comportamento
1. Toque → haptic leve + botão troca para "Na sacola ✓" por ~1,2 s (feedback imediato no ponto do toque).
2. Uma "bolinha" com a cor escolhida voa do botão até o ícone da sacola no topo da tela, em arco (~450 ms, só `transform`/`opacity` na UI thread).
3. Na chegada: o ícone da sacola dá um "bump" (escala + leve giro) e o **badge com a quantidade** (novo no ícone da tela de produto) pulsa — o mesmo badge e lógica da tab bar.
4. Toast mantido como complemento (com "Ver sacola"), pois anuncia o resultado ao leitor de tela.
5. Toque duplo acidental: toques repetidos em < 500 ms são ignorados. Intenção de adicionar mais unidades continua possível (stepper ou novo toque depois do intervalo).
6. **Movimento reduzido**: sem voo nem bump; só o número do badge e o estado do botão mudam.
7. Rótulo de acessibilidade do ícone inclui a contagem ("Abrir sacola, 3 itens").
