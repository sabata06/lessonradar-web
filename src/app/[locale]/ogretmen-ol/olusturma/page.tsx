import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";

import { Container } from "@/components/layout/Container";
import { WizardShell } from "@/components/onboarding/wizard/WizardShell";
import { requireAuth } from "@/lib/auth/guards";
import { getAccessToken } from "@/lib/auth/cookies";
import { getCsrfToken } from "@/lib/security/csrf";
import { apiClient, ApiError } from "@/api/client";
import { ENDPOINTS } from "@/api/endpoints";
import {
  fetchAllDisciplines,
  fetchCities,
} from "@/lib/data/api/marketplace";
import type {
  ApplicationApiPayload,
} from "@/lib/teacher-application/types";
import { type Locale } from "@/i18n/routing";
import { buildPageMetadata } from "@/lib/seo/metadata";

interface RouteParams {
  locale: string;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<Metadata> {
  const { locale } = await params;
  return buildPageMetadata({
    locale: locale as Locale,
    path: "/ogretmen-ol/olusturma",
    title:
      locale === "tr"
        ? "Öğretmen başvurusu"
        : "Tutor application",
    description:
      locale === "tr"
        ? "LessonRadar öğretmen başvuru sihirbazı."
        : "LessonRadar tutor application wizard.",
    noindex: true,
  });
}

async function loadOrCreateApplication(
  accessToken: string,
): Promise<ApplicationApiPayload | { error: "cooldown"; availableAt?: string }> {
  try {
    return await apiClient.get<ApplicationApiPayload>(
      ENDPOINTS.TEACHER_APPLICATION_CURRENT,
      { accessToken },
    );
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 404) {
      throw error;
    }
  }
  try {
    return await apiClient.post<ApplicationApiPayload>(
      ENDPOINTS.TEACHER_APPLICATION_START,
      {},
      { accessToken },
    );
  } catch (error) {
    if (error instanceof ApiError && error.status === 429) {
      const availableAt =
        error.detail &&
        typeof error.detail === "object" &&
        "available_at" in error.detail
          ? String((error.detail as { available_at: unknown }).available_at)
          : undefined;
      return { error: "cooldown", availableAt };
    }
    throw error;
  }
}

export default async function TeacherApplicationWizardPage({
  params,
}: {
  params: Promise<RouteParams>;
}) {
  const { locale: rawLocale } = await params;
  const locale = rawLocale as Locale;
  setRequestLocale(locale);

  const sessionUser = await requireAuth({ next: "/ogretmen-ol/olusturma" });
  await getCsrfToken();

  const token = await getAccessToken();
  if (!token) {
    // requireAuth should already have redirected; defensive guard.
    return null;
  }

  const initial = await loadOrCreateApplication(token);

  const [citiesEnvelope, disciplinesEnvelope] = await Promise.all([
    fetchCities(),
    fetchAllDisciplines(),
  ]);

  if ("error" in initial && initial.error === "cooldown") {
    return (
      <Container className="max-w-3xl py-12 sm:py-16">
        <header className="space-y-3">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {locale === "tr"
              ? "Şu an yeni başvuru başlatamazsın"
              : "You can't start a new application yet"}
          </h1>
          <p className="text-base leading-relaxed text-muted-foreground">
            {locale === "tr"
              ? "Son başvurun reddedilmiş. 7 günlük süre dolduktan sonra yeni başvuru oluşturabilirsin."
              : "Your most recent application was rejected. You can apply again once the 7-day cooldown ends."}
            {initial.availableAt
              ? locale === "tr"
                ? ` (Yeniden başvuru: ${new Date(initial.availableAt).toLocaleDateString("tr-TR")})`
                : ` (Available again: ${new Date(initial.availableAt).toLocaleDateString("en-US")})`
              : null}
          </p>
        </header>
      </Container>
    );
  }

  const application = initial as ApplicationApiPayload;

  if (
    application.status !== "draft" &&
    application.status !== "needs_changes"
  ) {
    // Submitted/under review/approved/rejected → status page handles it.
    return (
      <Container className="max-w-3xl py-12 sm:py-16">
        <header className="space-y-3">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {locale === "tr"
              ? "Başvurun zaten alındı"
              : "Your application is already submitted"}
          </h1>
          <p className="text-base leading-relaxed text-muted-foreground">
            {locale === "tr"
              ? "Başvurunun durumunu panelinden takip edebilirsin."
              : "Track its status from your dashboard."}
          </p>
          <p>
            <a
              href={`/${locale}/panel-ogretmen/basvuru-durumu`}
              className="font-medium text-brand hover:underline"
            >
              {locale === "tr" ? "Başvuru durumunu gör →" : "View status →"}
            </a>
          </p>
        </header>
      </Container>
    );
  }

  return (
    <Container className="max-w-3xl py-10 sm:py-14">
      <header className="mb-8 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand">
          {locale === "tr" ? "Öğretmen Başvurusu" : "Tutor Application"}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          {locale === "tr"
            ? "Profilini birlikte oluşturalım"
            : "Let's build your profile together"}
        </h1>
        <p className="text-base leading-relaxed text-muted-foreground">
          {locale === "tr"
            ? "Her adım otomatik kaydedilir. İstediğin zaman aralık verip kaldığın yerden devam edebilirsin."
            : "Every step is auto-saved. You can leave and resume from where you stopped."}
        </p>
      </header>

      <WizardShell
        initial={application}
        cities={citiesEnvelope.results}
        disciplines={disciplinesEnvelope.results}
        accountEmail={sessionUser.email}
        consentVersions={{
          kvkk: "2026-05-08",
          terms: "2026-05-08",
          teacherAgreement: "v0.1-taslak",
        }}
      />
    </Container>
  );
}
