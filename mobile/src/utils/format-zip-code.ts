export  function formatZipCode(value: string): string {
  return value
    .replace(/\D/g, "") 
    .replace(/^(\d{5})(\d)/, "$1-$2")
    .slice(0, 9);
}