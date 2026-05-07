/**
 * Profile-level index policy. Distinct from pSEO landing quality
 * because the inputs differ — a profile is one teacher, not a list,
 * so we lean on identity/diploma verification, social proof, and
 * profile completeness rather than supply count.
 *
 *   index           → verified + reviewed + complete profile
 *   noindex-follow  → has identity verification but signal-thin
 *   sitemap-excluded → unverified or near-empty profile (treated as
 *                     placeholder; we still serve the page so the
 *                     teacher can edit, but Google should not crawl it)
 */
import type { TeacherProfile } from "@/lib/types";
import type { IndexPolicy } from "./quality-score";

export interface ProfileIndexBreakdown {
  policy: IndexPolicy;
  reasons: string[];
  score: number;
}

export function computeProfileIndexPolicy(
  teacher: TeacherProfile,
): ProfileIndexBreakdown {
  const reasons: string[] = [];
  let score = 0;

  // Verification (max 50)
  if (teacher.trust.identityVerified) {
    score += 25;
    reasons.push("identity_verified=+25");
  }
  if (teacher.trust.diplomaVerified) {
    score += 25;
    reasons.push("diploma_verified=+25");
  }

  // Review depth (max 30)
  const reviewScore = Math.min(30, teacher.trust.reviewCount * 2);
  score += reviewScore;
  reasons.push(`reviews=${reviewScore} (count=${teacher.trust.reviewCount})`);

  // Completeness (max 20)
  const completenessScore = Math.round((teacher.profileCompleteness / 100) * 20);
  score += completenessScore;
  reasons.push(`completeness=${completenessScore} (avg=${teacher.profileCompleteness})`);

  const clamped = Math.min(100, Math.max(0, score));

  let policy: IndexPolicy;
  if (
    teacher.trust.isVerified &&
    teacher.profileCompleteness >= 80 &&
    teacher.trust.reviewCount > 0 &&
    clamped >= 70
  ) {
    policy = "index";
  } else if (teacher.trust.identityVerified && teacher.profileCompleteness >= 60) {
    policy = "noindex-follow";
  } else {
    policy = "sitemap-excluded";
  }

  return { policy, reasons, score: clamped };
}
