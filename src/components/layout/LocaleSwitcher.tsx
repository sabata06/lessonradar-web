"use client";

import { useLocale, useTranslations } from "next-intl";
import { HugeiconsIcon } from "@hugeicons/react";
import { GlobalIcon } from "@hugeicons/core-free-icons";

import { routing } from "@/i18n/routing";
import { usePathname, useRouter } from "@/i18n/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const LABELS: Record<string, string> = { tr: "Türkçe", en: "English" };

export function LocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("nav");

  return (
    <Select
      value={locale}
      onValueChange={(next) => {
        router.replace(pathname, { locale: next as (typeof routing.locales)[number] });
      }}
    >
      <SelectTrigger
        size="sm"
        aria-label={t("language")}
        className="h-9 gap-2 rounded-full border-border bg-transparent px-3 text-sm font-medium text-muted-foreground hover:bg-muted"
      >
        <HugeiconsIcon icon={GlobalIcon} size={16} strokeWidth={1.6} />
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        {routing.locales.map((l) => (
          <SelectItem key={l} value={l}>
            {LABELS[l] ?? l}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
