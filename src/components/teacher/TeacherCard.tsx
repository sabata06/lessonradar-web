import Image from "next/image";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon, MapsLocation01Icon } from "@hugeicons/core-free-icons";

import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { formatHourlyRange } from "@/lib/format";
import type { SupportedLocale, TeacherProfile } from "@/lib/types";

import {
  PremiumBadge,
  RatingLine,
  TrustRow,
  VerifiedBadge,
} from "./TrustSignals";

type TeacherCardVariant = "compact" | "default" | "featured";

interface TeacherCardProps {
  teacher: TeacherProfile;
  locale: SupportedLocale;
  /**
   * Server-supplied "now" so relative time strings (last active) render
   * identically on SSR and client.
   */
  nowIso: string;
  variant?: TeacherCardVariant;
  /**
   * Discipline context for pSEO pages — pricing shown matches this slug.
   * Falls back to the teacher's primary discipline.
   */
  disciplineSlug?: string;
  className?: string;
}

export function TeacherCard({
  teacher,
  locale,
  nowIso,
  variant = "default",
  disciplineSlug,
  className,
}: TeacherCardProps) {
  const activeDisciplineSlug = disciplineSlug ?? teacher.primaryDisciplineSlug;
  const pricing =
    teacher.disciplines.find((d) => d.disciplineSlug === activeDisciplineSlug) ??
    teacher.disciplines[0];
  const disciplineLabel = pickLocalizedOptionalName(pricing?.name, locale);
  const cityLabel =
    pickLocalizedOptionalName(teacher.cityName, locale) ?? teacher.citySlug;
  const districtLabel = pickLocalizedOptionalName(teacher.districtName, locale);

  const profileHref = `/ogretmen/${teacher.slug}`;
  const requestHref = `/ders-talebi?discipline=${activeDisciplineSlug}&city=${teacher.citySlug}&teacher=${teacher.slug}`;

  if (variant === "compact") {
    return (
      <CompactCard
        href={profileHref}
        teacher={teacher}
        locale={locale}
        priceLabel={
          pricing
            ? formatHourlyRange(pricing.hourlyMin, pricing.hourlyMax, locale)
            : "—"
        }
        className={className}
      />
    );
  }

  if (variant === "featured") {
    return (
      <FeaturedCard
        teacher={teacher}
        locale={locale}
        nowIso={nowIso}
        priceLabel={
          pricing ? formatHourlyRange(pricing.hourlyMin, pricing.hourlyMax, locale) : "—"
        }
        disciplineLabel={disciplineLabel ?? ""}
        cityLabel={cityLabel}
        districtLabel={districtLabel}
        profileHref={profileHref}
        requestHref={requestHref}
        className={className}
      />
    );
  }

  // default — vertical card for pSEO + search listings (original layout
  // restored). Top half is a profile-clickable Link with avatar + name +
  // verified/premium badges + headline + rating; bottom half holds the
  // location/trust meta row and the discipline+price line with a single
  // amber "İletişime Geç" action button. The standalone "Profile" button
  // was removed — the whole header already links to the profile.
  return (
    <article
      className={cn(
        "group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-shadow hover:shadow-elevated",
        className,
      )}
    >
      <Link
        href={profileHref}
        className="flex items-start gap-4 p-5"
        aria-label={teacher.fullName}
      >
        <Avatar teacher={teacher} size={72} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="truncate text-base font-semibold text-foreground">
              {teacher.fullName}
            </h3>
            {teacher.trust.isVerified && <VerifiedBadge size="sm" />}
            {teacher.isPremium && <PremiumBadge />}
          </div>
          <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
            {teacher.headline}
          </p>
          <RatingLine
            className="mt-2"
            rating={teacher.trust.ratingAverage}
            count={teacher.trust.reviewCount}
            locale={locale}
          />
        </div>
      </Link>

      <div className="flex flex-col gap-3 px-5 pb-5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <HugeiconsIcon icon={MapsLocation01Icon} size={12} strokeWidth={2} />
            {districtLabel ? `${districtLabel} · ${cityLabel}` : cityLabel}
          </span>
          <TrustRow trust={teacher.trust} locale={locale} nowIso={nowIso} />
        </div>

        <div className="flex items-end justify-between gap-3 border-t border-border pt-3">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {disciplineLabel ?? ""}
            </p>
            <p className="truncate text-base font-semibold text-foreground">
              {pricing ? formatHourlyRange(pricing.hourlyMin, pricing.hourlyMax, locale) : "—"}
            </p>
          </div>
          <Button
            asChild
            size="sm"
            className="shrink-0 gap-1.5 bg-action text-action-foreground hover:bg-action-hover"
          >
            <Link href={requestHref}>
              {locale === "tr" ? "İletişime Geç" : "Contact"}
              <HugeiconsIcon
                icon={ArrowRight01Icon}
                size={14}
                strokeWidth={2.2}
                aria-hidden
              />
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/*  Variant: compact (horizontal shelf card)                           */
/* ------------------------------------------------------------------ */

function CompactCard({
  href,
  teacher,
  locale,
  priceLabel,
  className,
}: {
  href: string;
  teacher: TeacherProfile;
  locale: SupportedLocale;
  priceLabel: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex w-full items-start gap-3 rounded-2xl border border-border bg-card p-3 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-elevated",
        className,
      )}
    >
      <Avatar teacher={teacher} size={64} />
      <div className="min-w-0 flex-1 py-0.5">
        <div className="flex items-center gap-1.5">
          <h3 className="truncate text-sm font-semibold text-foreground">
            {teacher.fullName}
          </h3>
          {teacher.trust.isVerified && (
            <span
              aria-label="Doğrulanmış"
              className="inline-flex size-4 items-center justify-center rounded-full bg-brand text-primary-foreground"
            >
              <svg viewBox="0 0 16 16" className="size-2.5" aria-hidden>
                <path
                  d="M3 8l3 3 7-7"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          )}
        </div>
        <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
          {teacher.headline}
        </p>
        <div className="mt-1.5">
          <RatingLine
            rating={teacher.trust.ratingAverage}
            count={teacher.trust.reviewCount}
            locale={locale}
          />
        </div>
        <p className="mt-1.5 text-sm font-semibold text-foreground">
          {priceLabel}
        </p>
      </div>
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/*  Variant: featured                                                  */
/* ------------------------------------------------------------------ */

function FeaturedCard({
  teacher,
  locale,
  nowIso,
  priceLabel,
  disciplineLabel,
  cityLabel,
  districtLabel,
  profileHref,
  requestHref,
  className,
}: {
  teacher: TeacherProfile;
  locale: SupportedLocale;
  nowIso: string;
  priceLabel: string;
  disciplineLabel: string;
  cityLabel: string;
  districtLabel?: string;
  profileHref: string;
  requestHref: string;
  className?: string;
}) {
  return (
    <article
      className={cn(
        "relative flex flex-col gap-5 overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-card sm:flex-row sm:items-start",
        className,
      )}
    >
      <div className="relative shrink-0">
        <Avatar teacher={teacher} size={120} className="rounded-2xl" />
        <div className="absolute -bottom-2 -right-2 flex gap-1">
          {teacher.trust.isVerified && (
            <span
              aria-label="Doğrulandı"
              className="grid size-9 place-items-center rounded-full border-2 border-card bg-brand text-primary-foreground shadow-sm"
            >
              <svg viewBox="0 0 16 16" className="size-4" aria-hidden>
                <path
                  d="M3 8l3 3 7-7"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          )}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-xl font-semibold text-foreground">
              {teacher.fullName}
            </h3>
            {teacher.isPremium && <PremiumBadge />}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{teacher.headline}</p>
        </div>

        <RatingLine
          rating={teacher.trust.ratingAverage}
          count={teacher.trust.reviewCount}
          locale={locale}
        />

        <p className="line-clamp-2 text-sm leading-relaxed text-foreground/80">
          {teacher.bio}
        </p>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <HugeiconsIcon icon={MapsLocation01Icon} size={12} strokeWidth={2} />
            {districtLabel ? `${districtLabel} · ${cityLabel}` : cityLabel}
          </span>
          <TrustRow trust={teacher.trust} locale={locale} nowIso={nowIso} />
        </div>

        <div className="mt-1 flex flex-wrap items-end justify-between gap-3 border-t border-border pt-4">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {disciplineLabel}
            </p>
            <p className="text-xl font-semibold text-foreground">{priceLabel}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="default">
              <Link href={profileHref}>
                {locale === "tr" ? "Profili Gör" : "View Profile"}
              </Link>
            </Button>
            <Button
              asChild
              size="default"
              className="bg-action text-action-foreground shadow-action hover:bg-action-hover"
            >
              <Link href={requestHref} className="inline-flex items-center gap-1.5">
                {locale === "tr" ? "İletişime Geç" : "Contact"}
                <HugeiconsIcon icon={ArrowRight01Icon} size={16} strokeWidth={2} />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/*  Atom: Avatar                                                       */
/* ------------------------------------------------------------------ */

function Avatar({
  teacher,
  size,
  className,
}: {
  teacher: TeacherProfile;
  size: number;
  className?: string;
}) {
  // The adapter substitutes `/og/default.png` for missing backend
  // avatars. That file is intentionally not in `/public` — we'd rather
  // surface initials than ship a generic stock face that looks broken.
  const hasRealAvatar =
    teacher.avatarUrl &&
    teacher.avatarUrl !== "/og/default.png" &&
    !teacher.avatarUrl.endsWith("/og/default.png");

  if (hasRealAvatar) {
    return (
      <Image
        src={teacher.avatarUrl}
        alt={teacher.fullName}
        width={size}
        height={size}
        className={cn(
          "h-auto rounded-2xl bg-muted object-cover ring-1 ring-border",
          className,
        )}
        sizes={`${size}px`}
      />
    );
  }

  return (
    <span
      aria-label={teacher.fullName}
      role="img"
      style={{ width: size, height: size }}
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center rounded-2xl bg-brand-soft font-semibold uppercase tracking-tight text-brand-soft-foreground ring-1 ring-border",
        className,
      )}
    >
      <span style={{ fontSize: Math.max(12, Math.round(size * 0.36)) }}>
        {getInitials(teacher.fullName)}
      </span>
    </span>
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

/* ------------------------------------------------------------------ */

function pickLocalizedOptionalName(
  c: { tr: string; en: string } | undefined,
  locale: SupportedLocale,
): string | undefined {
  if (!c) return undefined;
  return locale === "tr" ? c.tr : c.en;
}
