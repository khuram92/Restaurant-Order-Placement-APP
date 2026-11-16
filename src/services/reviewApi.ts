import { api } from "../lib/api";
import type { NewReviewInput, Review, ReviewListResponse } from "../types/review";

/** Customer: rate a completed order (once) */
export const createReview = async (orderId: string, input: NewReviewInput) => {
  const { data } = await api.post<{ review: Review; message: string }>(`/orders/${orderId}/review`, {
    rating: input.rating,
    tags: input.tags,
    ...(input.comment?.trim() && { comment: input.comment.trim() }),
  });
  return data.review;
};

/** Customer: my review of this order, or null */
export const getMyOrderReview = async (orderId: string) => {
  const { data } = await api.get<{ review: Review | null }>(`/orders/${orderId}/review`);
  return data.review;
};

/** Anyone: a restaurant's reviews + star summary */
export const listRestaurantReviews = async (restaurantId: string, page = 1, rating?: number) => {
  const { data } = await api.get<ReviewListResponse>(`/restaurants/${restaurantId}/reviews`, {
    params: { page, ...(rating && { rating }) },
  });
  return data;
};