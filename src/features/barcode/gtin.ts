/** GTIN-8, 12, 13 ou 14 com dígito verificador válido (a mesma regra da API). */
export function isValidGtin(value: string): boolean {
  if (!/^(\d{8}|\d{12,14})$/.test(value)) return false;
  const digits = [...value].map(Number);
  const check = digits.pop()!;
  // Da direita para a esquerda, os dígitos alternam pesos 3 e 1.
  const sum = digits.reverse().reduce((total, digit, index) => total + digit * (index % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === check;
}
