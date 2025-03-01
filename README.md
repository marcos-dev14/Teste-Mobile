# 🛒 Teste Prático - Desenvolvedor Mobile Full Stack

## 📌 Descrição Geral

O objetivo deste teste é desenvolver uma aplicação **mobile de e-commerce** seguindo um design pré-definido no **Figma**. A aplicação deve permitir que os usuários naveguem por produtos, adicionem itens ao carrinho e finalizem suas compras.

A aplicação foi desenvolvida utilizando **React Native (Expo)** para o frontend e **Node.js (NestJS)** para o backend, utilizando **Prisma** para a camada de acesso ao banco de dados.

## ⚙️ Tecnologias Utilizadas

### 📱 **Frontend (Mobile)**
- **[React Native](https://reactnative.dev/)** com **[Expo](https://expo.dev/)**
- **[Expo Router](https://expo.github.io/router/)** para navegação
- **[React Hook Form](https://react-hook-form.com/)** para gerenciamento de formulários
- **[Zod](https://zod.dev/)** para validação de formulários
- **[React Query](https://tanstack.com/query/latest)** para requisições e cache de dados
- **[tailwindcss](https://tailwindcss.com/)** com **[NativeWind](https://www.nativewind.dev/)** para estilização

### 🖥️ **Backend (API)**
- **[Node.js](https://nodejs.org/)** com **[NestJS](https://nestjs.com/)**
- **[Prisma ORM](https://www.prisma.io/)** para acesso ao banco de dados
- **[PostgreSQL](https://www.postgresql.org/)** como banco de dados
- **[Docker](https://www.docker.com/)** para rodar o PostgreSQL e o backend

### 🛠️ **Outros**
- **TypeScript** em todo o projeto
- Testes automatizados com **Jest**
- Gerenciamento de estado adequado para performance e estabilidade

## 🚀 **Como Rodar o Projeto**

## 🔹 **1. Clonar o repositório**
```sh
git clone https://github.com/marcos-dev14/Teste-Mobile.git
cd Teste-Mobile
```

## **Configuração do backend**

1. **Navegue até o diretório do server:**
  ```sh
  cd ../server
  ```

2. **Copie o arquivo `.env.example` para `.env` e configure as variáveis de ambiente:**
  ```sh
  cp .env.example .env
  ```
3. **Suba o banco de dados com Docker:**
  ```sh
  docker-compose up -d
  ```

4. **Instale as dependências:**
  ```sh
  npm install
  ```

5. **Execute as migrações do Prisma:**
  ```sh
  npx prisma migrate dev
  ```

6. **Criação dos produtos e da conta de login:**
  ```sh
  npm run seed
  ```

7. **Inicie o servidor:**
  ```sh
  npm run start ou npm run start:dev
  ```

## **Configuração do mobile**

1. **Navegue até o diretório do mobile:**
  ```sh
  cd ../mobile
  ```

2. **Instale as dependências:**
  ```sh
  yarn install
   ou
  npm install
  ```
3. **Acesse o arquivo axios.ts no campinho src/lib/axios.ts e configure o endereço do backend com o IP da sua máquina e a porta 3000:**
  ```sh
  baseURL: `"http://192.168.0.106:3000"`,
  ```
4. **Navegue até o diretório do mobile:**
  ```sh
  npx expo start
  ```

Abra o Expo Go no celular ou use um emulador para testar o app.
