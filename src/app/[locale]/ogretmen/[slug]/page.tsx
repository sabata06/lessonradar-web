import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";

import { Container } from "@/components/layout/Container";
import { Breadcrumb } from "@/components/discovery/Breadcrumb";
import { JsonLd } from "@/components/seo/JsonLd";
import { ProfileHero } from "@/components/teacher/profile/ProfileHero";
import { ProfileStats } from "@/components/teacher/profile/ProfileStats";
import { ProfileBio } from "@/components/teacher/profile/ProfileBio";
import { ProfileDisciplines } from "@/components/teacher/profile/ProfileDisciplines";
import { ProfileModalitySection } from "@/components/teacher/profile/ProfileModalitySection";
import { ProfileTrustChecklist } from "@/components/teacher/profile/ProfileTrustChecklist";
import { ProfileReviewsPlaceholder } from "@/components/teacher/profile/ProfileReviewsPlaceholder";
import { ProfileSimilarTeachers } from "@/components/teacher/profile/ProfileSimilarTeachers";
import { ProfileSidebar } from "@/components/teacher/profile/ProfileSidebar";
import { ProfileStickyCTA } from "@/components/teacher/profile/ProfileStickyCTA";

import { routing, type Locale } from "@/i18n/routing";
import {
  getAllTeacherSlugs,
  getTeacherProfileData,
} from "@/lib/data/profile";
import { buildPageMetadata } from "@/lib/seo/metadata";
import {
  breadcrumbJsonLd,
  profilePageJsonLd,
} from "@/lib/seo/jsonld";
import {
  pickLocalized,
  type SupportedLocale,
} from "@/lib/types";
import { formatHourlyRange } from "@/lib/format";

interface RouteParams {
  locale: string;
  slug: string;
}

/**
 * Pre-render every known teacher × locale at build time. Mock dataset is
 * five teachers, so this is fine; once the backend is live we'll swap to a
 * paginated list and rely on ISR for cold profiles.
 */
export function generateStaticParams() {
  const slugs = getAllTeacherSlugs();
  const params: RouteParams[] = [];
  for (const locale of routing.locales) {
    for (const slug of slugs) {
      params.push({ locale, slug });
    }
  }
  return params;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const data = getTeacherProfileData(slug);
  if (!data) return {};

  const t = await getTranslations({ locale, namespace: "profile.meta" });
  const typedLocale = locale as Locale;

  const cityName = data.city
    ? typedLocale === "tr"
      ? data.city.nameTr
      : data.city.nameEn
    : "";
  const disciplineName = data.primaryDiscipline
    ? pickLocalized(data.primaryDiscipline.name, typedLocale)
    : "";

  const ratingLine =
    data.teacher.trust.reviewCount > 0
      ? typedLocale === "tr"
        ? `${data.teacher.trust.ratingAverage.toFixed(1)} puan, ${data.teacher.trust.reviewCount} değerlendirme.`
        : `${data.teacher.trust.ratingAverage.toFixed(1)} rating from ${data.teacher.trust.reviewCount} reviews.`
      : "";

  const priceLine = data.pricingRange
    ? `${formatHourlyRange(
        data.pricingRange.min,
        data.pricingRange.max,
        typedLocale as SupportedLocale,
      )}.`
    : "";

  const title = t("title", {
    name: data.teacher.fullName,
    discipline: disciplineName,
    city: cityName,
  });
  const description = t("description", {
    name: data.teacher.fullName,
    discipline: disciplineName.toLowerCase(),
    city: cityName,
    ratingLine,
    priceLine,
  }).replace(/\s{2,}/g, " ").trim();

  return buildPageMetadata({
    locale: typedLocale,
    path: `/ogretmen/${slug}`,
    title,
    description,
    noindex: data.index.policy !== "index",
    type: "profile",
    ogImage: data.teacher.avatarUrl,
  });
}

export default async function TeacherProfilePage({
  params,
}: {
  params: Promise<RouteParams>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const data = getTeacherProfileData(slug);
  if (!data) notFound();

  const typedLocale = locale as Locale;
  const supportedLocale = locale as SupportedLocale;
  const nowIso = new Date().toISOString();

  const cityName = data.city
    ? typedLocale === "tr"
      ? data.city.nameTr
      : data.city.nameEn
    : "";
  const districtName = data.district
    ? typedLocale === "tr"
      ? data.district.nameTr
      : data.district.nameEn
    : "";

  const breadcrumbs = [
    { label: typedLocale === "tr" ? "Anasayfa" : "Home", path: "/" },
    {
      label: cityName,
      path: `/${data.teacher.citySlug}`,
    },
    {
      label: data.teacher.fullName,
      path: `/ogretmen/${data.teacher.slug}`,
    },
  ];

  const t = await getTranslations({ locale, namespace: "profile" });

  return (
    <>
      <Container className="pt-6 pb-4 sm:pt-8">
        <Breadcrumb
          items={breadcrumbs.map((b, i) => ({
            label: b.label,
            href: i < breadcrumbs.length - 1 ? b.path : undefined,
          }))}
        />
      </Container>

      <Container className="grid gap-6 pb-24 lg:grid-cols-[1fr_22rem] lg:items-start lg:gap-10 lg:pb-20">
        {/* Main column */}
        <div className="space-y-6">
          <ProfileHero data={data} locale={supportedLocale} nowIso={nowIso} />
          <ProfileStats teacher={data.teacher} locale={supportedLocale} />
          <ProfileBio teacher={data.teacher} />
          <ProfileDisciplines
            views={data.disciplineViews}
            citySlug={data.teacher.citySlug}
            locale={supportedLocale}
          />
          <ProfileModalitySection
            teacher={data.teacher}
            city={data.city}
            district={data.district}
            cityName={cityName}
            districtName={districtName}
          />
          <ProfileTrustChecklist teacher={data.teacher} />
          <ProfileReviewsPlaceholder teacher={data.teacher} />
          <ProfileSimilarTeachers
            teachers={data.similarTeachers}
            city={data.city}
            locale={supportedLocale}
            nowIso={nowIso}
          />

          <p className="rounded-2xl border border-dashed border-border bg-muted/30 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
            {t("policy_notice")}
          </p>
        </div>

        {/* Desktop sidebar */}
        <ProfileSidebar
          teacherSlug={data.teacher.slug}
          citySlug={data.teacher.citySlug}
          primaryDisciplineSlug={data.teacher.primaryDisciplineSlug}
          pricingRange={data.pricingRange}
          locale={supportedLocale}
        />
      </Container>

      {/* Mobile sticky CTA — replaces the global MobileBottomBar on /ogretmen/* */}
      <ProfileStickyCTA
        teacherSlug={data.teacher.slug}
        citySlug={data.teacher.citySlug}
        primaryDisciplineSlug={data.teacher.primaryDisciplineSlug}
        pricingRange={data.pricingRange}
        locale={supportedLocale}
      />

      <JsonLd
        data={[
          breadcrumbJsonLd(
            typedLocale,
            breadcrumbs.map((b) => ({ name: b.label, path: b.path })),
          ),
          profilePageJsonLd(
            typedLocale,
            data.teacher,
            data.disciplineViews.map((v) => v.discipline),
            data.city,
          ),
        ]}
      />
    </>
  );
}
