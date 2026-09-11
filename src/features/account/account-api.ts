import { apiRequest } from "../../lib/api";
import { Page, ProductPublic, Review } from "../products/product-api";

export interface OwnReview extends Review {
  product: ProductPublic;
}

export function getOwnReviews(token: string, page = 1) {
  const params = new URLSearchParams({ page: String(page), page_size: "20" });
  return apiRequest<Page<OwnReview>>(`/api/v1/users/me/reviews?${params}`, {}, token);
}

export function getOwnProducts(token: string, page = 1) {
  const params = new URLSearchParams({ page: String(page), page_size: "20" });
  return apiRequest<Page<ProductPublic>>(`/api/v1/users/me/products?${params}`, {}, token);
}
