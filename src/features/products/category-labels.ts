import type { Category } from "./product-api";

export const categoryLabels: Record<Category, string> = {
  food: "Alimentos",
  beverages: "Bebidas",
  cleaning: "Limpeza",
  personal_hygiene: "Higiene pessoal",
  household_utilities: "Utilidades domésticas",
  other: "Outros",
};

export function getCategoryLabel(category: Category): string {
  return categoryLabels[category];
}
