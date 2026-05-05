/**
 * pSEO landing quality score policy.
 *
 *   80+   → indexable, included in sitemap
 *   50-79 → noindex, follow (do not pollute index, still discoverable)
 *   <50   → excluded from sitemap entirely (lead-collection mode)
 *
 * Inputs are derived from real data only. AI-generated copy alone does not
 * raise the score — verifier signals and active teacher supply do.
 */
import type { TeacherProfile } from "@/lib/types";

export type IndexPolicy = "index" | "noindex-follow" | "sitemap-excluded";

export interface QualityScoreBreakdown {
  score: number;
  policy: IndexPolicy;
  reasons: string[];
}

export interface QualityScoreInput {
  teachers: TeacherProfile[];
  hasUniqueIntro: boolean;     // human-edited city/discipline intro paragraph
  hasPriceDataPoint: boolean;  // observed avg/min hourly visible
  hasReviewSignal: boolean;    // ≥1 teacher with reviews
}

export function computeQualityScore(input: QualityScoreInput): QualityScoreBreakdown {
  const reasons: string[] = [];
  let score = 0;

  // Teacher supply (max 50)
  const verifiedCount = input.teachers.filter((t) => t.trust.isVerified).length;
  const supplyScore = Math.min(50, verifiedCount * 12 + (input.teachers.length - verifiedCount) * 4);
  score += supplyScore;
  reasons.push(`teacher_supply=${supplyScore} (verified=${verifiedCount}, total=${input.teachers.length})`);

  // Trust depth (max 20)
  const avgRating =
    input.teachers.reduce((sum, t) => sum + (t.trust.reviewCount > 0 ? t.trust.ratingAverage : 0), 0) /
    Math.max(1, input.teachers.filter((t) => t.trust.reviewCount > 0).length);
  const reviewedCount = input.teachers.filter((t) => t.trust.reviewCount > 0).length;
  const trustScore = Math.min(20, reviewedCount * 5 + (avgRating >= 4.5 ? 5 : 0));
  score += trustScore;
  reasons.push(`trust=${trustScore} (reviewed_teachers=${reviewedCount}, avg=${avgRating.toFixed(2)})`);

  // Content depth (max 20)
  let contentScore = 0;
  if (input.hasUniqueIntro) contentScore += 10;
  if (input.hasPriceDataPoint) contentScore += 6;
  if (input.hasReviewSignal) contentScore += 4;
  score += contentScore;
  reasons.push(`content=${contentScore}`);

  // Profile completeness avg (max 10)
  const completenessAvg =
    input.teachers.reduce((sum, t) => sum + t.profileCompleteness, 0) /
    Math.max(1, input.teachers.length);
  const completenessScore = Math.round(completenessAvg / 10);
  score += completenessScore;
  reasons.push(`completeness=${completenessScore} (avg=${completenessAvg.toFixed(0)})`);

  const clamped = Math.min(100, Math.max(0, Math.round(score)));
  const policy: IndexPolicy =
    clamped >= 80 ? "index" : clamped >= 50 ? "noindex-follow" : "sitemap-excluded";

  return { score: clamped, policy, reasons };
}

export function shouldIncludeInSitemap(p: IndexPolicy): boolean {
  return p === "index";
}

export function shouldNoindex(p: IndexPolicy): boolean {
  return p !== "index";
}
