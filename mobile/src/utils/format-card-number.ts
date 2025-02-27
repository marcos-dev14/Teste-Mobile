export function formatCardNumber(value: string): string {
  return value
    .replace(/\D/g, "")
    .replace(/(\d{4})/g, "$1 ")
    .trim() 
    .slice(0, 19);
}