import { apiRequest } from "../../lib/api";

export type SearchField = "name" | "brand" | "barcode";
export type RepurchaseIntent = "yes" | "maybe" | "no";

export interface ProductListItem {
  id: number;
  name: string;
  brand: string;
  variant: string | null;
  quantity: number;
  unit: "g" | "ml" | "un";
  category: string;
  barcode: string | null;
  community_summary: {
    total_reviews: number;
    repurchase_intent: Record<RepurchaseIntent, number>;
  };
  your_repurchase_intent: RepurchaseIntent | null;
}

export interface ProductPage {
  items: ProductListItem[];
  page: number;
  page_size: number;
  total: number;
}

export interface ProductSearchInput {
  field: SearchField;
  value: string;
  page?: number;
}

export function searchProducts(
  input: ProductSearchInput,
  token?: string | null,
) {
  const params = new URLSearchParams({
    [input.field]: input.value.trim(),
    page: String(input.page ?? 1),
    page_size: "20",
  });

  return apiRequest<ProductPage>(`/api/v1/products?${params}`, {}, token);
}
