export function formatSecurityCode(value: string): string {
  return value
    .replace(/\D/g, "") 
    .slice(0, 4);
}