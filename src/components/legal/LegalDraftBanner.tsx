import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";

interface LegalDraftBannerProps {
  contactEmail: string;
}

/**
 * Loud "this is a draft" notice rendered above the content for any legal
 * document that has not yet cleared attorney review. The page is also
 * `noindex` and excluded from the sitemap while the draft flag is set —
 * this banner is the in-page user-facing signal.
 */
export function LegalDraftBanner({ contactEmail }: LegalDraftBannerProps) {
  const t = useTranslations("legal.draft_banner");
  return (
    <aside
      role="note"
      aria-label={t("aria_label")}
      className="mb-10 flex flex-col gap-2 rounded-2xl border border-warning/40 bg-warning/10 p-5 text-sm text-foreground/90"
    >
      <span className="inline-flex w-fit items-center gap-2 rounded-full bg-warning/30 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-foreground">
        {t("pill")}
      </span>
      <p className="font-medium">{t("title")}</p>
      <p className="text-foreground/70">{t("body")}</p>
      <p className="text-foreground/70">
        {t.rich("contact", {
          link: (chunks) => (
            <Link
              href={`mailto:${contactEmail}`}
              className="font-medium text-brand underline-offset-4 hover:underline"
            >
              {chunks}
            </Link>
          ),
          email: contactEmail,
        })}
      </p>
    </aside>
  );
}
