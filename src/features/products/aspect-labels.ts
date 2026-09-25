import type { Aspect } from "./review-api";

/** Ordem de exibição no formulário de avaliação. */
export const aspectOptions: Array<{ value: Aspect; label: string }> = [
  { value: "taste", label: "Sabor" }, { value: "fragrance", label: "Cheiro ou fragrância" },
  { value: "texture_consistency", label: "Textura ou consistência" }, { value: "effectiveness_performance", label: "Eficácia ou desempenho" },
  { value: "quantity_yield", label: "Quantidade ou rendimento" }, { value: "ease_of_use_preparation", label: "Facilidade de uso ou preparo" },
  { value: "packaging", label: "Embalagem" }, { value: "durability_preservation", label: "Durabilidade ou conservação" },
  { value: "composition_ingredients", label: "Composição ou ingredientes" }, { value: "safety_tolerance", label: "Segurança ou tolerância" },
  { value: "price", label: "Preço" }, { value: "other", label: "Outro" },
];

const labels = Object.fromEntries(aspectOptions.map(({ value, label }) => [value, label])) as Record<Aspect, string>;

export function getAspectLabel(aspect: string): string {
  return labels[aspect as Aspect] ?? aspect;
}
