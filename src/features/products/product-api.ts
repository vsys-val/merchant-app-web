import { apiRequest } from "../../lib/api";

export type RepurchaseIntent = "yes" | "maybe" | "no";
export type Quality = "high" | "adequate" | "low";
export type Expectation = "exceeded" | "met" | "not_met";
export type ValueForMoney = "good" | "fair" | "poor";
export type Category = "food" | "beverages" | "cleaning" | "personal_hygiene" | "household_utilities" | "other";

export interface ProductPublic {
  id: number;
  name: string;
  brand: string;
  variant: string | null;
  quantity: number;
  unit: "g" | "ml" | "un";
  category: Category;
  barcode: string | null;
}

export interface ProductCreateInput {
  name: string;
  brand: string;
  variant: string | null;
  quantity: number;
  unit: "g" | "kg" | "ml" | "L" | "un";
  category: Category;
  barcode: string | null;
}

export interface Review {
  id: number;
  repurchase_intent: RepurchaseIntent;
  quality: Quality;
  expectation: Expectation;
  value_for_money: ValueForMoney;
  reasons: Array<{ aspect: string; perception: "positive" | "negative" }>;
  comment: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductListItem extends ProductPublic {
  community_summary: { total_reviews: number; repurchase_intent: Record<RepurchaseIntent, number> };
  your_repurchase_intent: RepurchaseIntent | null;
}

export interface ProductDetail extends ProductPublic {
  community_summary: {
    total_reviews: number;
    repurchase_intent: Record<RepurchaseIntent, number>;
    quality: Record<Quality, number>;
    expectation: Record<Expectation, number>;
    value_for_money: Record<ValueForMoney, number>;
  };
  your_review: Review | null;
}

export interface CommunityReview extends Review { author_name: string; }
export interface Page<T> { items: T[]; page: number; page_size: number; total: number; }
/** Nome, marca e categoria combinam com E; o código de barras é exclusivo. */
export interface ProductFilters {
  name?: string;
  brand?: string;
  category?: Category;
  barcode?: string;
}

export function filtersToParams(filters: ProductFilters, page = 1) {
  const params = new URLSearchParams();
  const entries: Array<[keyof ProductFilters, string | undefined]> = filters.barcode?.trim()
    ? [["barcode", filters.barcode]]
    : [["name", filters.name], ["brand", filters.brand], ["category", filters.category]];
  for (const [key, value] of entries) {
    const trimmed = value?.trim();
    if (trimmed) params.set(key, trimmed);
  }
  if (page > 1) params.set("page", String(page));
  return params;
}

export function searchProducts(filters: ProductFilters, page = 1, token?: string | null) {
  const params = filtersToParams(filters, page);
  params.set("page", String(page));
  params.set("page_size", "20");
  return apiRequest<Page<ProductListItem>>(`/api/v1/products?${params}`, {}, token);
}

export function getProductDetail(productId: number, token?: string | null) {
  return apiRequest<ProductDetail>(`/api/v1/products/${productId}`, {}, token);
}

export function getCommunityReviews(productId: number, page = 1, token?: string | null) {
  const params = new URLSearchParams({ page: String(page), page_size: "20" });
  return apiRequest<Page<CommunityReview>>(`/api/v1/products/${productId}/reviews?${params}`, {}, token);
}

/** Campos ausentes são mantidos; `null` em variante ou código remove o valor. */
export type ProductPatchInput = Partial<ProductCreateInput>;

export function updateProduct(productId: number, input: ProductPatchInput, token: string) {
  return apiRequest<ProductPublic>(`/api/v1/products/${productId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  }, token);
}

export function createProduct(input: ProductCreateInput, token: string) {
  return apiRequest<ProductPublic>("/api/v1/products", {
    method: "POST",
    body: JSON.stringify(input),
  }, token);
}
