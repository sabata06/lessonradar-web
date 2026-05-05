import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon, MailSend02Icon } from "@hugeicons/core-free-icons";

import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import type { SupportedLocale } from "@/lib/types";

interface EmptyLeadCollectionProps {
  locale: SupportedLocale;
  cityName: string;
  disciplineName: string;
  citySlug: string;
  disciplineSlug: string;
}

/**
 * Empty-state view shown when a (city × discipline) pSEO landing has no
 * verified tutors yet. Per AGENTS.md hard rule: teacher-empty pages must
 * NOT be indexed as empty lists — they switch to lead-collection mode
 * and the metadata layer applies noindex.
 */
export function EmptyLeadCollection({
  locale,
  cityName,
  disciplineName,
  citySlug,
  disciplineSlug,
}: EmptyLeadCollectionProps) {
  const requestHref = `/ders-talebi?discipline=${disciplineSlug}&city=${citySlug}`;

  return (
    <section
      aria-labelledby="empty-state-heading"
      className="relative overflow-hidden rounded-3xl border border-border bg-card p-8 text-center sm:p-14"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-90"
        style={{
          background:
            "radial-gradient(80% 60% at 50% 0%, oklch(0.94 0.025 195 / 0.55) 0%, transparent 70%)",
        }}
      />
      <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-brand-soft text-brand-soft-foreground">
        <HugeiconsIcon icon={MailSend02Icon} size={28} strokeWidth={1.7} />
      </div>
      <h2
        id="empty-state-heading"
        className="mx-auto mt-5 max-w-xl text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
      >
        {locale === "tr"
          ? `${cityName}'de ${disciplineName.toLowerCase()} öğretmenleri için ilk sıradasın.`
          : `Be the first to ask for ${disciplineName.toLowerCase()} tutors in ${cityName}.`}
      </h2>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
        {locale === "tr"
          ? "Bu kombinasyon için şu an doğrulanmış öğretmenimiz yok. Branşını ve ihtiyacını söyle — eşleşen öğretmenler sana yazsın. Ücretsiz, app gerekmez."
          : "We don't yet have verified tutors here. Tell us what you need and matching tutors will reach out. Free, no app required."}
      </p>
      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <Button
          asChild
          size="lg"
          className="gap-2 bg-action text-action-foreground shadow-action hover:bg-action-hover"
        >
          <Link href={requestHref}>
            {locale === "tr" ? "Ders Talebi Oluştur" : "Post a Lesson Request"}
            <HugeiconsIcon icon={ArrowRight01Icon} size={16} strokeWidth={2} />
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href={`/${citySlug}`}>
            {locale === "tr"
              ? `${cityName}'deki diğer branşlar`
              : `Other subjects in ${cityName}`}
          </Link>
        </Button>
      </div>
    </section>
  );
}
