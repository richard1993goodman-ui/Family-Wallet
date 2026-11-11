// What to tell people about the legal status of an agreement's wording. Pure, so it is easy to test.
export type ReviewStatus = "draft" | "under_review" | "approved" | "superseded";

export type TemplateReview = {
  status: ReviewStatus;
  reviewerName?: string | null;
  reviewedAt?: string | null;
} | null;

const NOT_REVIEWED =
  "Not yet legally reviewed. This is general information, not legal advice, and does not replace independent legal advice.";

/**
 * The label shown on an agreement. It says "reviewed" only when the template is approved AND a named reviewer and a
 * review date are recorded; anything else, including no template at all, is shown as not yet legally reviewed.
 */
export function reviewLabel(review: TemplateReview): { approved: boolean; text: string } {
  const name = review?.reviewerName?.trim();
  if (review?.status === "approved" && name && review.reviewedAt) {
    const date = new Date(review.reviewedAt).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    return {
      approved: true,
      text: `Reviewed by ${name} on ${date}. This does not replace independent legal advice.`,
    };
  }
  return { approved: false, text: NOT_REVIEWED };
}
