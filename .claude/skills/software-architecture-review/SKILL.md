---
name: software-architecture-review
description: Procedimento de análise arquitetural e registro de decisões técnicas (ADRs) para o mini e-commerce. Use ao avaliar uma mudança estrutural, uma nova dependência, um novo módulo ou um contrato entre mobile, API e banco.
---

# Revisão arquitetural

Base: `docs/02-arquitetura.md` (ADRs, contrato) e `docs/03-convencoes.md`.

## Procedimento
1. **Levante fatos**: leia o código afetado; liste módulos, dependências e chamadas envolvidas. Nada de suposição sem marcar como tal.
2. **Formule o problema** em uma frase e o critério de sucesso mensurável.
3. **Liste ≥ 2 opções** (inclua "não fazer nada"). Para cada: complexidade, risco, impacto em segurança/performance, custo de reversão.
4. **Dependência nova?** Verifique: compatibilidade (Expo SDK 57 / Node 24), presença no Expo Go (mobile), manutenção (último release, issues), peers, tamanho, `pnpm audit`. Prefira API nativa da plataforma.
5. **Decida** e registre um ADR curto (contexto, opções, decisão, consequências) em `docs/02-arquitetura.md`.
6. **Defina o aceite**: comandos e testes que comprovam a decisão.

## Critérios de qualidade
- Limites respeitados: rotas sem SQL; repositórios sem HTTP; telas sem chamadas HTTP diretas.
- Dependências apontam para dentro (features → ui/lib; nunca ui → features).
- Contrato único por recurso; mudança de contrato atualiza servidor, tipos do app e doc no mesmo commit.

## Erros comuns
- Abstração especulativa ("vamos precisar de um repositório genérico").
- Introduzir lib para resolver o que 20 linhas resolvem (ex.: migrations, compiladores Zod).
- Decidir sem ler o código existente.

## Validação
ADR registrado, critérios de aceite executados e verdes, revisão do agente `fullstack-reviewer` quando afetar arquitetura, persistência, autenticação ou contrato.
