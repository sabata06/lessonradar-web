import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowRight01Icon,
  MapsLocation01Icon,
  QuoteDownIcon,
} from "@hugeicons/core-free-icons";

import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { formatLira } from "@/lib/format";
import type { Locale } from "@/i18n/routing";
import {
  LastActiveDot,
  PremiumBadge,
  RatingLine,
  ResponseTimePill,
  VerifiedBadge,
} from "@/components/teacher/TrustSignals";
import type { LeadOffer } from "@/lib/lead/customer-lead-detail";

interface Props {
  offer: LeadOffer;
  /** Customer's lead discipline — used to pick the right hourly rate. */
  disciplineSlug?: string;
  locale: Locale;
  nowIso: string;
  /** Subtle "first responder" emphasis for the top card. */
  emphasizeFirst?: boolean;
}

/**
 * Render a single teacher offer card. Stays calm — trust signals first,
 * teacher's message second, profile CTA tertiary. The "Request lesson" action
 * is intentionally not duplicated here; the conversion path is the profile
 * page which already carries the booking CTA.
 */
export async function LeadOfferCard({
  offer,
  disciplineSlug,
  locale,
  nowIso,
  emphasizeFirst,
}: Props) {
  const t = await getTranslations("panel.customer.leads.detail.offer");
  const { teacher } = offer;

  const cityLabel = teacher.city_name ?? teacher.city_slug ?? null;
  const districtLabel = teacher.district_name ?? teacher.district_slug ?? null;
  const locationLine =
    cityLabel && districtLabel
      ? `${cityLabel} · ${districtLabel}`
      : (cityLabel ?? districtLabel);

  const matchingSpecialty =
    teacher.specialties.find((s) => s.discipline_slug === disciplineSlug) ??
    teacher.specialties[0];
  const hourlyFallback = toNumberOrNull(teacher.hourly_rate);
  const specialtyMin = toNumberOrNull(matchingSpecialty?.hourly_min ?? null);
  const specialtyMax = toNumberOrNull(matchingSpecialty?.hourly_max ?? null);
  const priceLabel = buildPriceLabel(
    specialtyMin,
    specialtyMax,
    hourlyFallback,
    locale,
  );
  const specialtyLabel =
    matchingSpecialty?.discipline_name ?? matchingSpecialty?.discipline_slug ?? null;

  const respondedAt = safeFormatDateTime(offer.responded_at, locale);
  const trust = {
    responseTimeMinutes: teacher.trust.median_response_minutes ?? 0,
    lastActiveAt: teacher.trust.last_active_at,
  };

  return (
    <article
      className={cn(
        "relative overflow-hidden rounded-2xl border bg-card p-5 shadow-card transition md:p-6",
        emphasizeFirst
          ? "border-brand/30 ring-1 ring-brand/10"
          : "border-border",
      )}
    >
      {/* Accent rail — brand only, never action. Distinguishes responded cards
          without shouting. */}
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-0.5 bg-brand/40"
      />

      <header className="flex flex-wrap items-start gap-4">
        <div className="shrink-0">
          {teacher.profile_image_url ? (
            <Image
              src={teacher.profile_image_url}
              alt={teacher.display_name}
              width={64}
              height={64}
              className="size-16 rounded-2xl object-cover"
            />
          ) : (
            <span className="grid size-16 place-items-center rounded-2xl bg-brand-soft text-base font-semibold text-brand-soft-foreground">
              {getInitials(teacher.display_name)}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-foreground">
              {teacher.display_name}
            </h3>
            {teacher.trust.verified_identity && teacher.trust.verified_diploma ? (
              <VerifiedBadge size="sm" />
            ) : null}
            {teacher.trust.premium ? <PremiumBadge /> : null}
          </div>
          {teacher.headline ? (
            <p className="text-sm text-muted-foreground">{teacher.headline}</p>
          ) : null}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {locationLine ? (
              <span className="inline-flex items-center gap-1">
                <HugeiconsIcon
                  icon={MapsLocation01Icon}
                  size={12}
                  strokeWidth={2}
                />
                {locationLine}
              </span>
            ) : null}
            <RatingLine
              rating={teacher.rating.average}
              count={teacher.rating.count}
              locale={locale}
            />
          </div>
        </div>
      </header>

      <div className="mt-5 rounded-xl bg-muted/40 p-4">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <HugeiconsIcon icon={QuoteDownIcon} size={12} strokeWidth={2} />
          {t("message_label")}
        </div>
        <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-foreground">
          {offer.response_message}
        </p>
        {respondedAt ? (
          <p className="mt-3 text-[11px] text-muted-foreground">
            {t("responded_at", { date: respondedAt })}
          </p>
        ) : null}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        {priceLabel ? (
          <span className="font-semibold text-foreground">
            {priceLabel}
            {specialtyLabel && specialtyLabel !== teacher.headline ? (
              <span className="ml-1 text-xs font-medium text-muted-foreground">
                · {specialtyLabel}
              </span>
            ) : null}
          </span>
        ) : null}
        <ResponseTimePill minutes={trust.responseTimeMinutes} locale={locale} />
        <LastActiveDot
          lastActiveAt={trust.lastActiveAt}
          nowIso={nowIso}
          locale={locale}
        />
      </div>

      <div className="mt-5">
        <Link
          href={`/ogretmen/${teacher.slug}`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-card px-3.5 py-2 text-sm font-semibold text-primary transition hover:bg-primary/5"
        >
          {t("view_profile")}
          <HugeiconsIcon icon={ArrowRight01Icon} size={14} strokeWidth={2.5} />
        </Link>
      </div>
    </article>
  );
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function buildPriceLabel(
  min: number | null,
  max: number | null,
  fallback: number | null,
  locale: Locale,
): string | null {
  const suffix = locale === "tr" ? "saat" : "hour";
  if (min !== null && max !== null) {
    if (min === max) return `${formatLira(min, locale)} / ${suffix}`;
    return `${formatLira(min, locale)} – ${formatLira(max, locale)} / ${suffix}`;
  }
  if (min !== null) return `${formatLira(min, locale)} / ${suffix}`;
  if (max !== null) return `${formatLira(max, locale)} / ${suffix}`;
  if (fallback !== null) return `${formatLira(fallback, locale)} / ${suffix}`;
  return null;
}

function toNumberOrNull(v: string | number | null | undefined): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function safeFormatDateTime(iso: string, locale: Locale): string | null {
  try {
    return new Date(iso).toLocaleString(locale === "tr" ? "tr-TR" : "en-US", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return null;
  }
}
