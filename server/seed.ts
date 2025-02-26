import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Dados dos produtos
  const products = [
    {
      name: 'Camiseta Básica',
      description: 'Camiseta de algodão 100%, disponível em várias cores.',
      price: 29.99,
      rating: 3.5,
      images: [
        'https://images.unsplash.com/photo-1581655353564-df123a1eb820?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1620799139652-715e4d5b2325?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
      ],
    },
    {
      name: 'Bermuda Jeans',
      description: 'Bermuda jeans masculina, ideal para o verão.',
      price: 59.99,
      rating: 3.5,
      images: [
        'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
      ],
    },
    {
      name: 'Calça Jeans Skinny',
      description: 'Calça jeans skinny feminina, ajustada e confortável.',
      price: 89.99,
      rating: 3.5,
      images: [
        'https://images.unsplash.com/photo-1542272604-787c3835535d?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1604176354204-9268737828e4?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
      ],
    },
    {
      name: 'Bolsa de Couro',
      description: 'Bolsa de couro sintético, elegante e durável.',
      price: 99.99,
      rating: 3.5,
      images: [
        'https://images.unsplash.com/photo-1566150902887-9679ecc155ba?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
      ],
    },
    {
      name: 'Camiseta Estampada',
      description: 'Camiseta com estampa exclusiva, disponível em vários tamanhos.',
      price: 39.99,
      rating: 3.5,
      images: [
        'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
      ],
    },
    {
      name: 'Bermuda Sarja',
      description: 'Bermuda de sarja, casual e confortável.',
      price: 49.99,
      rating: 3.5,
      images: [
        'https://images.unsplash.com/photo-1591047139820-db1e9e9b9c9f?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
      ],
    },
    {
      name: 'Calça Jogger',
      description: 'Calça jogger masculina, moderna e versátil.',
      price: 79.99,
      rating: 3.5,
      images: [
        'https://images.unsplash.com/photo-1602293589930-45aad59ba3ab?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
      ],
    },
    {
      name: 'Bolsa Transversal',
      description: 'Bolsa transversal pequena, ideal para o dia a dia.',
      price: 69.99,
      rating: 3.5,
      images: [
        'https://images.unsplash.com/photo-1594035910387-fea47794261f?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
      ],
    },
  ];

  // Inserir produtos no banco de dados
  for (const product of products) {
    await prisma.product.create({
      data: product,
    });
  }

  console.log('Seed concluído: Produtos criados com sucesso!');
}

main()
  .catch((e) => {
    console.error('Erro ao executar o seed:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });