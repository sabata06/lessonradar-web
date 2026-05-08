import Image from "next/image";
import { useTranslations } from "next-intl";
import { HugeiconsIcon } from "@hugeicons/react";
import { MapsLocation01Icon } from "@hugeicons/core-free-icons";

import { cn } from "@/lib/utils";
import { pickLocalized, type SupportedLocale } from "@/lib/types";
import type { TeacherProfileData } from "@/lib/data/profile";

import {
  PremiumBadge,
  RatingLine,
  TrustRow,
  VerifiedBadge,
} from "../TrustSignals";

interface ProfileHeroProps {
  data: TeacherProfileData;
  locale: SupportedLocale;
  nowIso: string;
}

/**
 * Profile hero. Mobile-first stack (avatar centered above identity), desktop
 * widens into a left-aligned avatar + identity column.
 *
 * No CTA inside the hero — the sidebar (desktop) and sticky bar (mobile) are
 * the only places primary action color lives. Per DESIGN.md, two action
 * buttons on the same fold is a red flag.
 */
export function ProfileHero({ data, locale, nowIso }: ProfileHeroProps) {
  const t = useTranslations("profile");
  const { teacher, city, district, primaryDiscipline } = data;

  const cityName = city ? (locale === "tr" ? city.nameTr : city.nameEn) : "";
  const districtName = district
    ? locale === "tr"
      ? district.nameTr
      : district.nameEn
    : "";
  const disciplineLabel = primaryDiscipline
    ? pickLocalized(primaryDiscipline.name, locale)
    : "";

  return (
    <header
      className={cn(
        "rounded-3xl border border-border bg-card p-5 shadow-card sm:p-7",
      )}
    >
      <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:gap-7">
        <Avatar src={teacher.avatarUrl} name={teacher.fullName} />

        <div className="min-w-0 flex-1 space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand">
            {t("hero.kicker")}
            {disciplineLabel && (
              <span className="text-muted-foreground"> · {disciplineLabel}</span>
            )}
          </p>

          <div className="space-y-1.5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl lg:text-4xl">
              {teacher.fullName}
            </h1>
            <p className="text-sm text-muted-foreground sm:text-base">
              {teacher.headline}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {teacher.trust.isVerified && <VerifiedBadge size="md" />}
            {teacher.isPremium && <PremiumBadge />}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
            <RatingLine
              rating={teacher.trust.ratingAverage}
              count={teacher.trust.reviewCount}
              locale={locale}
            />
            <span
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"
              aria-label={t("modality.location_label")}
            >
              <HugeiconsIcon
                icon={MapsLocation01Icon}
                size={14}
                strokeWidth={2}
                aria-hidden
              />
              {districtName ? `${districtName} · ${cityName}` : cityName}
            </span>
            <TrustRow
              trust={teacher.trust}
              locale={locale}
              nowIso={nowIso}
              className="text-xs"
            />
          </div>
        </div>
      </div>
    </header>
  );
}

function Avatar({ src, name }: { src: string; name: string }) {
  // Two avatar sizes: 96px on mobile, 128px on sm+ — Image needs a fixed
  // intrinsic size so we ship the larger one and let CSS scale down. The
  // ring + cream backplate gives the photo a frame on dark photos.
  //
  // Initials fallback when the backend hasn't supplied a real avatar.
  // `/og/default.png` is the adapter's placeholder marker — see
  // `lib/data/adapters/teacher.ts`.
  const hasRealAvatar =
    src && src !== "/og/default.png" && !src.endsWith("/og/default.png");

  return (
    <div className="relative shrink-0">
      <div
        className={cn(
          "relative grid place-items-center rounded-full",
          "size-24 sm:size-32",
          "ring-2 ring-border ring-offset-4 ring-offset-card",
          hasRealAvatar ? "bg-muted" : "bg-brand-soft",
        )}
      >
        {hasRealAvatar ? (
          <Image
            src={src}
            alt={name}
            width={128}
            height={128}
            className="size-full rounded-full object-cover"
            sizes="(min-width: 640px) 128px, 96px"
            priority
          />
        ) : (
          <span
            aria-label={name}
            role="img"
            className="select-none text-2xl font-semibold uppercase tracking-tight text-brand-soft-foreground sm:text-3xl"
          >
            {getInitials(name)}
          </span>
        )}
      </div>
    </div>
  );
}

function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toLocaleUpperCase("tr");
  }
  return (
    parts[0][0] + parts[parts.length - 1][0]
  ).toLocaleUpperCase("tr");
}
