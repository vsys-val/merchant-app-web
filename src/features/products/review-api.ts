import { apiRequest } from "../../lib/api";
import {
  Expectation,
  Quality,
  RepurchaseIntent,
  Review,
  ValueForMoney,
} from "./product-api";

export type Aspect =
  | "taste" | "fragrance" | "texture_consistency"
  | "effectiveness_performance" | "quantity_yield"
  | "ease_of_use_preparation" | "packaging"
  | "durability_preservation" | "composition_ingredients"
  | "safety_tolerance" | "price" | "other";

export interface ReviewInput {
  repurchase_intent: RepurchaseIntent;
  quality: Quality;
  expectation: Expectation;
  value_for_money: ValueForMoney;
  reasons: Array<{ aspect: Aspect; perception: "positive" | "negative" }>;
  comment: string | null;
}

export function createReview(productId: number, input: ReviewInput, token: string) {
  return apiRequest<Review>(`/api/v1/products/${productId}/reviews`, {
    method: "POST",
    body: JSON.stringify(input),
  }, token);
}

export function updateReview(reviewId: number, input: ReviewInput, token: string) {
  return apiRequest<Review>(`/api/v1/reviews/${reviewId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  }, token);
}

export function deleteReview(reviewId: number, token: string) {
  return apiRequest<void>(`/api/v1/reviews/${reviewId}`, { method: "DELETE" }, token);
}
