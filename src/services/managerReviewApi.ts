import { api } from "../lib/api";
import type { ManagerReviewFilter, ManagerReviewListResponse, Review } from "../types/review";


export const listMyRestaurantReviews = async (filter: ManagerReviewFilter = "all", page = 1) => {
  const { data } = await api.get<ManagerReviewListResponse>("/manager/reviews", {
    params: {
      page,
      ...(filter === "unanswered" && { unanswered: "true" }),
      ...(typeof filter === "number" && { rating: filter }),
    },
  });
  return data;
};


export const replyToReview = async (reviewId: string, text: string) => {
  const { data } = await api.patch<{ review: Review; message: string }>(`/manager/reviews/${reviewId}/reply`, { text });
  return data.review;
};