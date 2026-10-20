/**
 * Trava de segurança: os testes recriam o schema e truncam tabelas.
 * Só aceitamos um banco cujo nome termine em `_test`.
 */
export function assertTestDatabase(url: string | undefined): string {
  if (!url) throw new Error('Defina DATABASE_URL_TEST no .env para executar os testes.')
  const name = new URL(url).pathname.replace(/^\//, '')
  if (!name.endsWith('_test')) {
    throw new Error(`Recusando executar testes no banco "${name}": o nome deve terminar com _test.`)
  }
  return url
}
