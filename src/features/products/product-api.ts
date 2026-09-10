import { apiRequest } from "../../lib/api";

export type SearchField = "name" | "brand" | "barcode";
export type RepurchaseIntent = "yes" | "maybe" | "no";
export type Quality = "high" | "adequate" | "low";
export type Expectation = "exceeded" | "met" | "not_met";
export type ValueForMoney = "good" | "fair" | "poor";

export interface ProductPublic {
  id: number;
  name: string;
  brand: string;
  variant: string | null;
  quantity: number;
  unit: "g" | "ml" | "un";
  category: string;
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
  community_summary: {
    total_reviews: number;
    repurchase_intent: Record<RepurchaseIntent, number>;
  };
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

export interface CommunityReview extends Review {
  author_name: string;
}

export interface Page<T> {
  items: T[];
  page: number;
  page_size: number;
  total: number;
}

export interface ProductSearchInput {
  field: SearchField;
  value: string;
  page?: number;
}

export function searchProducts(input: ProductSearchInput, token?: string | null) {
  const params = new URLSearchParams({
    [input.field]: input.value.trim(),
    page: String(input.page ?? 1),
    page_size: "20",
  });
  return apiRequest<Page<ProductListItem>>(`/api/v1/products?${params}`, {}, token);
}

export function getProductDetail(productId: number, token?: string | null) {
  return apiRequest<ProductDetail>(`/api/v1/products/${productId}`, {}, token);
}

export function getCommunityReviews(
  productId: number,
  page = 1,
  token?: string | null,
) {
  const params = new URLSearchParams({ page: String(page), page_size: "20" });
  return apiRequest<Page<CommunityReview>>(
    `/api/v1/products/${productId}/reviews?${params}`,
    {},
    token,
  );
}
