import { useState } from "react";
import { Bathtub, Broom, Coffee, ForkKnife, HouseLine, Package } from "@phosphor-icons/react";
import type { Category } from "./product-api";

const CATEGORY_ICONS = {
  food: ForkKnife,
  beverages: Coffee,
  cleaning: Broom,
  personal_hygiene: Bathtub,
  household_utilities: HouseLine,
  other: Package,
} satisfies Record<Category, typeof Package>;

/**
 * Foto da embalagem ou ícone da categoria.
 *
 * A foto vem direto do provedor: carrega sob demanda e
 * sem enviar a página de origem. Se falhar, volta para o ícone.
 */
export function ProductImage({
  product,
  size,
  onImageError,
}: {
  product: { name: string; brand: string; category: Category; image_url?: string | null };
  size: "thumb" | "hero";
  onImageError?: () => void;
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const Icon = CATEGORY_ICONS[product.category] ?? Package;
  const pixels = size === "thumb" ? 76 : 220;

  if (!product.image_url || failedUrl === product.image_url) {
    return (
      <span className={`productImage productImage--${size} productImage--empty${size === "thumb" ? " productPlaceholder" : ""}`} aria-hidden="true">
        <Icon size={size === "thumb" ? 34 : 64} weight="duotone" />
      </span>
    );
  }
  return (
    <span className={`productImage productImage--${size}${size === "thumb" ? " productPlaceholder" : ""}`}>
      <img
        src={product.image_url}
        alt={`Embalagem de ${product.name}, ${product.brand}`}
        width={pixels}
        height={pixels}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => { setFailedUrl(product.image_url ?? null); onImageError?.(); }}
      />
    </span>
  );
}
