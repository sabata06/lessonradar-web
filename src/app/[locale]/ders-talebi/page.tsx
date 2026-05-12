import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";

import { HugeiconsIcon } from "@hugeicons/react";
import { AlertCircleIcon } from "@hugeicons/core-free-icons";

import { Container } from "@/components/layout/Container";
import { LeadForm } from "@/components/lead/LeadForm";
import { LeadEmailVerificationGate } from "@/components/lead/LeadEmailVerificationGate";
import { Breadcrumb } from "@/components/discovery/Breadcrumb";

import { type Locale } from "@/i18n/routing";
import { TR_CITIES, TR_DISTRICTS } from "@/lib/data/mock/cities";
import { MOCK_DISCIPLINES, MOCK_DOMAINS } from "@/lib/data/mock/disciplines";
import { fetchTeacherDetailBySlug } from "@/lib/data/api/marketplace";
import { adaptTeacher } from "@/lib/data/adapters/teacher";
import { requireAuth } from "@/lib/auth/guards";
import { buildPageMetadata } from "@/lib/seo/metadata";

// Auth gate forces server-side cookie read; this page can't be prerendered.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "lead" });
  return buildPageMetadata({
    locale: locale as Locale,
    path: "/ders-talebi",
    title: t("meta.title"),
    description: t("meta.description"),
    noindex: false,
  });
}

interface SearchParams {
  discipline?: string;
  city?: string;
  district?: string;
  /**
   * Optional teacher slug — when present, the lead form pre-fills the
   * intended recipient and shows a "scoped to this tutor" banner.
   */
  teacher?: string;
}

function buildNextParam(sp: SearchParams): string {
  const search = new URLSearchParams();
  if (sp.discipline) search.set("discipline", sp.discipline);
  if (sp.city) search.set("city", sp.city);
  if (sp.district) search.set("district", sp.district);
  if (sp.teacher) search.set("teacher", sp.teacher);
  const qs = search.toString();
  return qs ? `/ders-talebi?${qs}` : "/ders-talebi";
}

export default async function LeadRequestPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const t = await getTranslations("lead");
  const typedLocale = locale as Locale;

  const nextPath = buildNextParam(sp);

  // Lead creation is authenticated-customer only. Anon visitors bounce to
  // /giris?next=...; teachers/admins bounce home via roleHomepage.
  const user = await requireAuth({
    role: ["customer", "admin"],
    next: nextPath,
  });

  // Fetch the target teacher (when provided) from the real backend, not from
  // mock data — mocks only run when LR_USE_MOCK=1. We need the teacher's
  // actual specialties to gate the discipline picker so the customer can't
  // submit a branch the teacher doesn't teach (backend would reject with
  // `invalid_target_teacher` per docs/B4_LEAD_BACKEND_CONTRACT.md).
  const apiTeacher = sp.teacher
    ? await fetchTeacherDetailBySlug(sp.teacher)
    : null;
  const targetTeacher = apiTeacher ? adaptTeacher(apiTeacher) : null;
  const teacherSlugRequested = Boolean(sp.teacher);
  const teacherNotFound = teacherSlugRequested && !targetTeacher;

  const allowedDisciplineSlugs = targetTeacher
    ? targetTeacher.disciplines
        .map((d) => d.disciplineSlug)
        .filter((slug) => MOCK_DISCIPLINES.some((md) => md.slug === slug))
    : undefined;

  const validCitySlug = TR_CITIES.find((c) => c.slug === sp.city)?.slug;
  const validDistrictSlug =
    validCitySlug && sp.district
      ? TR_DISTRICTS.find((d) => d.citySlug === validCitySlug && d.slug === sp.district)?.slug
      : undefined;

  // Discipline default: when scoped to a teacher, honour the URL hint only
  // if it's within the allowlist; otherwise let the form auto-fill (single
  // allowed) or stay empty (multi). When no teacher scope, fall back to the
  // URL slug if it's in our catalog.
  let validDisciplineSlug: string | undefined;
  if (allowedDisciplineSlugs && allowedDisciplineSlugs.length > 0) {
    if (sp.discipline && allowedDisciplineSlugs.includes(sp.discipline)) {
      validDisciplineSlug = sp.discipline;
    } else if (allowedDisciplineSlugs.length === 1) {
      validDisciplineSlug = allowedDisciplineSlugs[0];
    }
  } else {
    validDisciplineSlug = MOCK_DISCIPLINES.find((d) => d.slug === sp.discipline)?.slug;
  }

  return (
    <>
      <Container className="pt-6 pb-4 sm:pt-8">
        <Breadcrumb
          items={[
            { label: typedLocale === "tr" ? "Anasayfa" : "Home", href: "/" },
            { label: t("breadcrumb") },
          ]}
        />
      </Container>

      <Container className="grid gap-10 pb-16 lg:grid-cols-[1fr_22rem] lg:items-start lg:pb-20">
        <div className="order-2 lg:order-1">
          <header className="space-y-3 pb-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand">
              {t("kicker")}
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              {t("title")}
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              {t("subtitle")}
            </p>
          </header>

          {teacherNotFound ? (
            <div
              role="alert"
              className="mb-4 flex items-start gap-3 rounded-2xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-foreground"
            >
              <HugeiconsIcon
                icon={AlertCircleIcon}
                size={18}
                strokeWidth={2}
                className="mt-0.5 shrink-0 text-warning-foreground"
              />
              <p>{t("teacher_not_found_warning")}</p>
            </div>
          ) : null}

          {user.isEmailVerified ? (
            <LeadForm
              locale={typedLocale}
              domains={MOCK_DOMAINS}
              disciplines={MOCK_DISCIPLINES}
              cities={TR_CITIES}
              districts={TR_DISTRICTS}
              defaults={{
                disciplineSlug: validDisciplineSlug,
                citySlug: validCitySlug,
                districtSlug: validDistrictSlug,
                teacherSlug: targetTeacher?.slug,
              }}
              targetTeacherName={targetTeacher?.fullName}
              allowedDisciplineSlugs={allowedDisciplineSlugs}
            />
          ) : (
            <LeadEmailVerificationGate
              locale={typedLocale}
              email={user.email}
              nextPath={nextPath}
            />
          )}
        </div>

        <aside className="order-1 lg:order-2 lg:sticky lg:top-24">
          <div className="space-y-4 rounded-2xl border border-border bg-card p-5 sm:p-6">
            <h2 className="text-base font-semibold text-foreground">{t("aside.title")}</h2>
            <ul className="space-y-3 text-sm">
              <AsideItem text={t("aside.item_free")} />
              <AsideItem text={t("aside.item_no_app")} />
              <AsideItem text={t("aside.item_verified")} />
              <AsideItem text={t("aside.item_response")} />
              <AsideItem text={t("aside.item_no_payment")} />
            </ul>
          </div>
        </aside>
      </Container>
    </>
  );
}

function AsideItem({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-2.5 text-foreground">
      <span
        aria-hidden
        className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-success-soft text-success"
      >
        <svg viewBox="0 0 16 16" className="size-3" aria-hidden>
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
      <span className="leading-relaxed text-foreground">{text}</span>
    </li>
  );
}
