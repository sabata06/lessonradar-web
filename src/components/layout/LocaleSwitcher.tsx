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
} from "@/components/ui/select";

const FULL_LABELS: Record<string, string> = { tr: "Türkçe", en: "English" };

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
        className="h-9 gap-2 rounded-full border-border bg-transparent px-3 text-sm font-medium text-muted-foreground hover:bg-muted [&>svg:last-child]:opacity-60"
      >
        <HugeiconsIcon icon={GlobalIcon} size={16} strokeWidth={1.6} />
        {/* Compact 2-letter code in the trigger; the dropdown shows full names.
            Avoids the trigger/content width mismatch that pushed the popover
            off to the side under Radix's default `item-aligned` positioning. */}
        <span aria-hidden>{locale.toUpperCase()}</span>
      </SelectTrigger>
      {/* `position="popper"` anchors the popover under the trigger instead of
          aligning the active item to the trigger label — the latter (Radix
          default) caused the dropdown to drift left when our trigger
          ("🌐 Türkçe") was wider than the content rows ("Türkçe"). */}
      <SelectContent position="popper" align="end" sideOffset={6} className="min-w-[10rem]">
        {routing.locales.map((l) => (
          <SelectItem key={l} value={l}>
            {FULL_LABELS[l] ?? l}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
