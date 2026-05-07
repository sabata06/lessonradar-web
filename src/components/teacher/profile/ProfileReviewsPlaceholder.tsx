import { useTranslations } from "next-intl";
import { HugeiconsIcon } from "@hugeicons/react";
import { MessageMultiple01Icon } from "@hugeicons/core-free-icons";

import { RatingStars } from "../RatingStars";
import type { TeacherProfile } from "@/lib/types";

interface ProfileReviewsPlaceholderProps {
  teacher: TeacherProfile;
}

/**
 * Reviews block. The platform does not yet have a public review system,
 * so this is a transparency-first placeholder rather than fabricated
 * snippets. We surface the aggregate (when present) without listing
 * individual reviews — that protects against showing fake-looking quotes
 * and complies with Google's spirit-of-the-law on review schema (must
 * be backed by real, on-page reviews to use Review markup).
 *
 * When the review system ships, replace this with paginated review cards
 * and add `Review` JSON-LD entries via the existing `JsonLd` mount.
 */
export function ProfileReviewsPlaceholder({
  teacher,
}: ProfileReviewsPlaceholderProps) {
  const t = useTranslations("profile.reviews");
  const hasReviews = teacher.trust.reviewCount > 0;

  return (
    <section
      aria-labelledby="profile-reviews-title"
      className="rounded-2xl border border-border bg-card p-5 shadow-card sm:p-6"
    >
      <header className="flex flex-wrap items-end justify-between gap-3">
        <h2
          id="profile-reviews-title"
          className="text-lg font-semibold text-foreground sm:text-xl"
        >
          {t("title")}
        </h2>
        {hasReviews && (
          <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <RatingStars value={teacher.trust.ratingAverage} />
            <span className="font-medium text-foreground">
              {teacher.trust.ratingAverage.toFixed(1)}
            </span>
            <span aria-hidden>·</span>
            <span>
              {t("summary", {
                count: teacher.trust.reviewCount,
                rating: teacher.trust.ratingAverage.toFixed(1),
              })}
            </span>
          </span>
        )}
      </header>

      <div className="mt-4 flex items-start gap-3 rounded-xl border border-dashed border-border bg-muted/30 p-4">
        <span
          aria-hidden
          className="grid size-10 shrink-0 place-items-center rounded-lg bg-card text-muted-foreground"
        >
          <HugeiconsIcon icon={MessageMultiple01Icon} size={20} strokeWidth={2} />
        </span>
        <div className="min-w-0 space-y-1.5">
          <p className="text-sm font-semibold text-foreground">
            {t("empty_title")}
          </p>
          <p className="text-sm text-muted-foreground">
            {t("empty_subtitle")}
          </p>
          <p className="text-xs text-muted-foreground">{t("verified_only")}</p>
        </div>
      </div>
    </section>
  );
}
