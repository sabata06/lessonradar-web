import { getTranslations } from "next-intl/server";
import { HugeiconsIcon } from "@hugeicons/react";
import { Mail01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { SupportedLocale } from "@/lib/types";

interface Props {
  locale: SupportedLocale;
  email: string;
  /** Where the verify-email flow should bounce back to after success. */
  nextPath: string;
}

export async function LeadEmailVerificationGate({ email, nextPath }: Props) {
  const t = await getTranslations("lead.gate.email_unverified");

  const verifyHref = `/eposta-dogrula?email=${encodeURIComponent(
    email,
  )}&next=${encodeURIComponent(nextPath)}`;

  return (
    <section
      role="region"
      aria-labelledby="lead-email-gate-title"
      className="space-y-5 rounded-2xl border border-action/30 bg-action/5 p-6 sm:p-8"
    >
      <div className="flex items-start gap-4">
        <span
          aria-hidden
          className="grid size-11 shrink-0 place-items-center rounded-xl bg-action/15 text-action-foreground"
        >
          <HugeiconsIcon icon={Mail01Icon} size={22} strokeWidth={1.8} />
        </span>
        <div className="space-y-1.5">
          <h2
            id="lead-email-gate-title"
            className="text-lg font-semibold text-foreground sm:text-xl"
          >
            {t("title")}
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {t.rich("body", {
              email: () => (
                <span className="font-medium text-foreground">{email}</span>
              ),
            })}
          </p>
        </div>
      </div>
      <Button
        asChild
        size="lg"
        className="w-full bg-action text-action-foreground shadow-action hover:bg-action/90 sm:w-auto"
      >
        <Link href={verifyHref}>
          <span className="inline-flex items-center gap-2">
            {t("cta")}
            <HugeiconsIcon icon={ArrowRight01Icon} size={16} strokeWidth={2.5} />
          </span>
        </Link>
      </Button>
      <p className="text-xs text-muted-foreground">{t("footnote")}</p>
    </section>
  );
}
