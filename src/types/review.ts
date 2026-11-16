/** Same list as the backend (models/Review.ts) */
export const REVIEW_TAGS = ["Tasty food", "Fast service", "Good value", "Friendly staff", "Well packed", "Clean place"] as const;
export type ReviewTag = (typeof REVIEW_TAGS)[number];

export interface Review {
  _id: string;
  customerName: string;
  orderType?: string;
  rating: number;
  comment?: string;
  tags: string[];
  reply?: { text: string; at: string };
  createdAt: string;
}

export interface RatingSummary {
  avg: number;
  count: number;
  breakdown: Record<"1" | "2" | "3" | "4" | "5", number>;
}

export interface ReviewListResponse {
  reviews: Review[];
  total: number;
  page: number;
  pages: number;
  summary: RatingSummary;
}

export interface NewReviewInput {
  rating: number;
  comment?: string;
  tags: ReviewTag[];
}