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
- **[Tailwindcss](https://tailwindcss.com/)** com **[NativeWind](https://www.nativewind.dev/)** para estilização

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
  cd .\server
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

6. **Criação dos produtos e da conta de login banco de dados:**
  ```sh
  npm run seed
  ```

7. **Inicie o servidor:**
  ```sh
  npm run start ou npm run start:dev
  ```

8. **Comando para rodar os testes:**
  ```sh
  npm run test
  ```

## **Configuração do mobile**

1. **Navegue até o diretório do mobile:**
  ```sh
  cd ..\mobile\
  ```

2. **Instale as dependências:**
  ```sh
  npm install
  ```
3. **Acesse o arquivo axios.ts no campinho src/lib/axios.ts e configure o endereço do backend com o IP da sua máquina e a porta 3000:**
  ```sh
  baseURL: "http://192.168.0.106:3000",
  ```
4. **Inicie o projeto mobile:**
  ```sh
  npx expo start
  ```

Abra o Expo Go no celular ou use um emulador para testar o app.

## **Documentação Técnica e Funcionalidades Extras**

## Backend

PostgreSQL: Foi escolhido como banco de dados relacional devido à sua robustez, escalabilidade e suporte.

Docker: Utilizei o para garantir a consistência entre ambientes de desenvolvimento e produção.

Pasta DTO: Organiza e valida dados transferidos entre partes da aplicação.

Tabelas: Criadas para usuário, produto, endereço e pedido, garantindo estruturação dos dados.


## Mobile

Expo Router: Facilita a navegação entre telas.

TailwindCSS + NativeWind: Agiliza a criação de layouts.

Pasta Theme: Centraliza as cores do projeto para consistência visual.

React Query: Gerencia requisições à API, substituindo useState e melhorando performance.

React Hook Form + Zod: Combinação eficiente para validação e criação de formulários.

Contextos: Dois contextos criados (usuário e carrinho) para gerenciar dados globais.

Pasta API: Centraliza chamadas à API, integradas com React Query.

Async Storage: Persiste dados do usuário e carrinho, evitando logins repetidos e mantendo o carrinho ao fechar o app.

Adaptações no Figma: Tela de criação de usuário adicionada e textos traduzidos para português, optei em traduzir para facilitar a compreensão dos usuários e seguir um padrão de linguagem.