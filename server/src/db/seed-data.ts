/**
 * Catálogo de desenvolvimento. Derivado do seed original, com correções:
 * - nomes/hex de cor agora correspondem às fotos (o original tinha "Vermelho" = #FFFFFF etc.);
 * - removida a foto de um perfume de marca registrada que estava cadastrada como "Bolsa Transversal";
 * - preços em centavos e estoque por cor.
 */
export interface SeedColor {
  name: string
  hex: string
  imageUrls: string[]
  stock: number
}

export interface SeedProduct {
  slug: string
  name: string
  description: string
  priceCents: number
  rating: number | null
  colors: SeedColor[]
}

const unsplash = (id: string) =>
  `https://images.unsplash.com/photo-${id}?w=900&q=80&auto=format&fit=crop`

export const seedProducts: SeedProduct[] = [
  {
    slug: 'camiseta-basica',
    name: 'Camiseta Básica',
    description:
      'Camiseta de malha 100% algodão penteado, gola careca reforçada e caimento reto. Uma peça de base para todos os dias.',
    priceCents: 2999,
    rating: 3.5,
    colors: [
      { name: 'Branco', hex: '#F2F2EF', imageUrls: [unsplash('1581655353564-df123a1eb820')], stock: 25 },
    ],
  },
  {
    slug: 'camisa-polo',
    name: 'Camisa Polo Piquet',
    description:
      'Polo em algodão piquet com gola e punhos canelados. Elegante sem perder o conforto.',
    priceCents: 7990,
    rating: 4.5,
    colors: [
      { name: 'Azul Royal', hex: '#2B3F8F', imageUrls: [unsplash('1521330784804-5f69f8a17b1d')], stock: 12 },
    ],
  },
  {
    slug: 'camiseta-estampada',
    name: 'Camiseta Estampada',
    description:
      'Camiseta de algodão com estampa frontal exclusiva em serigrafia. Modelagem regular.',
    priceCents: 3999,
    rating: 3.5,
    colors: [
      { name: 'Preto', hex: '#1C1C1C', imageUrls: [unsplash('1618354691373-d851c5c3a990')], stock: 8 },
    ],
  },
  {
    slug: 'calca-jogger-feminina',
    name: 'Calça Jogger Feminina',
    description:
      'Jogger em tecido fluido com cós de elástico, bolsos utilitários e barra com punho. Leve e versátil.',
    priceCents: 7999,
    rating: 4,
    colors: [
      { name: 'Rosé', hex: '#D4A08F', imageUrls: [unsplash('1594633312681-425c7b97ccd1')], stock: 15 },
    ],
  },
  {
    slug: 'calca-jeans-reta',
    name: 'Calça Jeans Reta',
    description:
      'Jeans de algodão com elastano, cintura média e perna reta. Lavagens clássicas que combinam com tudo.',
    priceCents: 8999,
    rating: 4,
    colors: [
      { name: 'Azul Médio', hex: '#4A6A94', imageUrls: [unsplash('1604176354204-9268737828e4')], stock: 10 },
      { name: 'Preto Lavado', hex: '#2A2D33', imageUrls: [unsplash('1542272604-787c3835535d')], stock: 0 },
    ],
  },
  {
    slug: 'bermuda-jeans',
    name: 'Bermuda Jeans',
    description: 'Bermuda jeans de lavagem clara, cinco bolsos e barra a fio. Ideal para o verão.',
    priceCents: 5999,
    rating: 3.5,
    colors: [
      { name: 'Azul Claro', hex: '#A9BFD6', imageUrls: [unsplash('1602293589930-45aad59ba3ab')], stock: 3 },
    ],
  },
  {
    slug: 'bolsa-transversal',
    name: 'Bolsa Transversal',
    description:
      'Bolsa compacta em couro sintético com detalhe geométrico e alça de corrente. Cabe o essencial do dia a dia.',
    priceCents: 9999,
    rating: 5,
    colors: [
      { name: 'Malva', hex: '#8C7B83', imageUrls: [unsplash('1566150902887-9679ecc155ba')], stock: 6 },
    ],
  },
]

/** Usuário de demonstração criado apenas fora de produção. Documentado no README, nunca exibido no app. */
export const demoUser = {
  name: 'Cliente Demo',
  email: 'demo@vesti.dev',
  password: 'vesti1234',
}
