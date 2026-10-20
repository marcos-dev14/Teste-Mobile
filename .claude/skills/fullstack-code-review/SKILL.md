---
name: fullstack-code-review
description: Checklist de revisão independente de código full stack (mobile, API, banco) com critérios verificáveis e formato de parecer APROVADO/REPROVADO. Use ao revisar qualquer entrega antes de considerá-la concluída.
---

# Revisão full stack independente

## 1. Verificações executáveis (obrigatórias)
```
cd server && pnpm typecheck && pnpm lint && pnpm test
cd mobile && pnpm typecheck && pnpm lint && pnpm test
```
Registre o resumo (nº de testes, falhas). Falha = reprovação automática.

## 2. Checklist de código
**Arquitetura** — camadas respeitadas (`docs/03-convencoes.md`); nenhuma dependência nova sem ADR; sem duplicação relevante.
**Contrato** — schema de resposta do servidor ↔ `mobile/src/lib/api/types.ts` (nomes, nulabilidade, centavos); erros por `code`.
**Segurança** — skill `application-security-review` (checklist por mudança).
**Persistência** — transação onde há leitura-para-escrita; consultas parametrizadas; índices; migration nova em vez de edição.
**Mobile** — quatro estados de UI; acessibilidade (rótulos, roles, 44 dp); tokens; sem `useEffect` derivando estado; query keys corretas; navegação sem "voltar" para estados inválidos.
**Testes** — cobrem o risco da mudança (não só o caminho feliz); sem `sleep` fixo; determinísticos.
**Performance** — sem N+1; listas memoizadas; imagens dimensionadas.

## 3. Verificação ponta a ponta
Pelo menos um fluxo afetado executado contra a API local (curl ou emulador), com evidência (status/saída).

## 4. Parecer
```
PARECER: APROVADO | REPROVADO
Verificações: <comandos e resultados>
Achados:
1. [BLOQUEANTE|IMPORTANTE|SUGESTÃO] arquivo:linha — problema — correção esperada — como verificar
```
Sem evidência não há achado; sem verificação executada não há aprovação.
