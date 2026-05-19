"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Alert02Icon,
  CheckmarkCircle02Icon,
  GlobalIcon,
} from "@hugeicons/core-free-icons";

import { BrandCombobox } from "@/components/ui/brand-combobox";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { updateProfileRequest } from "@/lib/account/client";
import { cn } from "@/lib/utils";

/**
 * Language picker that persists the choice on the profile (so future emails +
 * mobile sessions agree) AND swaps the current URL to the new locale prefix.
 */
export function LanguagePicker() {
  const t = useTranslations("panel.settings.account.language");
  const tErrors = useTranslations("account.errors");
  const currentLocale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<
    | { kind: "idle" }
    | { kind: "saving" }
    | { kind: "saved" }
    | { kind: "error"; message: string }
  >({ kind: "idle" });

  const options = routing.locales.map((locale) => ({
    value: locale,
    label: t(`options.${locale}`),
  }));

  async function applyLocale(next: Locale) {
    if (next === currentLocale) return;
    setStatus({ kind: "saving" });
    const result = await updateProfileRequest({ locale: next });
    if (!result.ok) {
      setStatus({
        kind: "error",
        message: tErrors.has(result.code)
          ? tErrors(result.code)
          : tErrors("unknown"),
      });
      return;
    }
    setStatus({ kind: "saved" });
    startTransition(() => {
      router.replace(pathname, { locale: next });
    });
  }

  return (
    <section
      aria-labelledby="language-heading"
      className="rounded-2xl border border-border bg-card p-5 shadow-card sm:p-6"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <HugeiconsIcon icon={GlobalIcon} size={18} strokeWidth={2} />
        </span>
        <div className="min-w-0">
          <h2 id="language-heading" className="text-sm font-semibold text-foreground">
            {t("title")}
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {t("description")}
          </p>
        </div>
      </div>
      <div className="mt-4 max-w-xs">
        <BrandCombobox
          value={currentLocale}
          onChange={(next) => void applyLocale(next as Locale)}
          options={options}
          placeholder={t("placeholder")}
          ariaLabel={t("title")}
          disabled={status.kind === "saving" || isPending}
          triggerClassName="h-11 rounded-xl"
        />
      </div>
      {status.kind === "saved" ? (
        <p
          role="status"
          className={cn(
            "mt-3 inline-flex items-center gap-1 text-xs font-medium text-success",
          )}
        >
          <HugeiconsIcon
            icon={CheckmarkCircle02Icon}
            size={12}
            strokeWidth={2.5}
          />
          {t("saved")}
        </p>
      ) : null}
      {status.kind === "error" ? (
        <p
          role="alert"
          className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-destructive"
        >
          <HugeiconsIcon icon={Alert02Icon} size={12} strokeWidth={2.5} />
          {status.message}
        </p>
      ) : null}
    </section>
  );
}
