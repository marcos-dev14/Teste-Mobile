export  function formatZipCode(value: string): string {
  return value
    .replace(/\D/g, "") // Remove tudo que não for número
    .replace(/^(\d{5})(\d)/, "$1-$2") // Adiciona o traço depois dos primeiros 5 dígitos
    .slice(0, 9); // Garante que o campo não tenha mais que 9 caracteres (8 números + 1 traço)
}