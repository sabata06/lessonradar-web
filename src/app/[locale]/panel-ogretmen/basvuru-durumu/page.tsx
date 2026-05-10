import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";

import { Container } from "@/components/layout/Container";
import { Link } from "@/i18n/navigation";
import { requireAuth } from "@/lib/auth/guards";
import { getAccessToken } from "@/lib/auth/cookies";
import { apiClient, ApiError } from "@/api/client";
import { ENDPOINTS } from "@/api/endpoints";
import type {
  ApplicationApiPayload,
  ApplicationStatus,
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
    path: "/panel-ogretmen/basvuru-durumu",
    title: locale === "tr" ? "Başvuru durumu" : "Application status",
    description:
      locale === "tr"
        ? "Öğretmen başvurunun durumunu takip et."
        : "Track your tutor application status.",
    noindex: true,
  });
}

export default async function ApplicationStatusPage({
  params,
}: {
  params: Promise<RouteParams>;
}) {
  const { locale: rawLocale } = await params;
  const locale = rawLocale as Locale;
  setRequestLocale(locale);

  await requireAuth({ next: "/panel-ogretmen/basvuru-durumu" });
  const token = await getAccessToken();
  if (!token) return null;

  let application: ApplicationApiPayload | null = null;
  try {
    application = await apiClient.get<ApplicationApiPayload>(
      ENDPOINTS.TEACHER_APPLICATION_CURRENT,
      { accessToken: token },
    );
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 404) throw error;
  }

  if (!application) {
    return (
      <Container className="max-w-3xl py-12 sm:py-16">
        <header className="space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {locale === "tr"
              ? "Henüz bir başvurun yok"
              : "You don't have an application yet"}
          </h1>
          <p className="text-base leading-relaxed text-muted-foreground">
            {locale === "tr"
              ? "Öğretmen olarak listelenmek istiyorsan başvuruya hemen başlayabilirsin."
              : "If you'd like to be listed as a tutor, you can start an application now."}
          </p>
          <p>
            <Link
              href="/ogretmen-ol/olusturma"
              className="inline-flex items-center gap-1 font-medium text-brand hover:underline"
            >
              {locale === "tr" ? "Başvuruya başla →" : "Start application →"}
            </Link>
          </p>
        </header>
      </Container>
    );
  }

  return (
    <Container className="max-w-3xl py-12 sm:py-16">
      <ApplicationStatusBlock application={application} locale={locale} />
    </Container>
  );
}

function ApplicationStatusBlock({
  application,
  locale,
}: {
  application: ApplicationApiPayload;
  locale: Locale;
}) {
  const config = statusCopy(application.status, locale);
  return (
    <article className="space-y-6">
      <header className="space-y-3">
        <p
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold tracking-wide"
          style={{ backgroundColor: config.pillBg, color: config.pillText }}
        >
          {config.pillLabel}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          {config.title}
        </h1>
        <p className="text-base leading-relaxed text-muted-foreground">
          {config.body}
        </p>
      </header>

      {application.review_notes ? (
        <section className="rounded-2xl border border-warning/30 bg-warning/10 p-5">
          <h2 className="mb-2 text-sm font-semibold text-foreground">
            {locale === "tr"
              ? "Değerlendirme notları"
              : "Reviewer notes"}
          </h2>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
            {application.review_notes}
          </p>
        </section>
      ) : null}

      <section className="flex flex-wrap items-center gap-3">
        {config.primaryAction ? (
          <Link
            href={config.primaryAction.href}
            className="inline-flex min-h-11 items-center rounded-full bg-action px-5 py-2.5 text-sm font-semibold text-action-foreground hover:bg-action-hover"
          >
            {config.primaryAction.label}
          </Link>
        ) : null}
        {config.secondaryAction ? (
          <Link
            href={config.secondaryAction.href}
            className="inline-flex min-h-11 items-center rounded-full border border-border px-5 py-2.5 text-sm font-medium text-foreground hover:border-brand/60 hover:text-brand"
          >
            {config.secondaryAction.label}
          </Link>
        ) : null}
      </section>
    </article>
  );
}

function statusCopy(status: ApplicationStatus, locale: Locale) {
  const tr = locale === "tr";

  switch (status) {
    case "draft":
      return {
        pillLabel: tr ? "Taslak" : "Draft",
        pillBg: "var(--brand-soft)",
        pillText: "var(--brand-soft-foreground)",
        title: tr ? "Başvurun taslak halinde" : "Your application is a draft",
        body: tr
          ? "Kaldığın yerden devam edebilirsin. Tüm adımları tamamladığında gönder."
          : "Pick up where you left off and submit once every step is filled.",
        primaryAction: {
          label: tr ? "Devam et" : "Continue",
          href: "/ogretmen-ol/olusturma",
        },
      };
    case "submitted":
    case "under_review":
      return {
        pillLabel: tr ? "İnceleniyor" : "Under review",
        pillBg: "var(--brand-soft)",
        pillText: "var(--brand-soft-foreground)",
        title: tr
          ? "Başvurun ekibimize ulaştı"
          : "Your application reached our team",
        body: tr
          ? "Başvurunu en geç 3 iş günü içinde inceliyoruz. Sonuç çıkınca sana e-posta atacağız."
          : "We'll review within 3 business days and email you the outcome.",
      };
    case "needs_changes":
      return {
        pillLabel: tr ? "Düzeltme isteniyor" : "Needs changes",
        pillBg: "color-mix(in oklab, var(--warning) 15%, transparent)",
        pillText: "var(--foreground)",
        title: tr
          ? "Başvurun için ek bilgi gerekiyor"
          : "We need a few changes",
        body: tr
          ? "Aşağıdaki notları okuyup ilgili adımları güncelle, ardından tekrar gönder."
          : "Read the notes below, update the relevant steps, and resubmit.",
        primaryAction: {
          label: tr ? "Düzeltmeye geç" : "Edit application",
          href: "/ogretmen-ol/olusturma",
        },
      };
    case "approved":
      return {
        pillLabel: tr ? "Onaylandı" : "Approved",
        pillBg: "color-mix(in oklab, var(--success) 18%, transparent)",
        pillText: "var(--success)",
        title: tr ? "Tebrikler! Profilin yayında" : "Welcome aboard 🎓",
        body: tr
          ? "Profilin LessonRadar'da yayında. Müsaitliğini ve fiyatlarını panelden güncel tut, ilk öğrencilerine ulaş."
          : "Your profile is live on LessonRadar. Keep availability and pricing fresh, and start reaching students.",
        primaryAction: {
          label: tr ? "Panele git" : "Open dashboard",
          href: "/panel-ogretmen",
        },
      };
    case "rejected":
      return {
        pillLabel: tr ? "Reddedildi" : "Rejected",
        pillBg: "color-mix(in oklab, var(--destructive) 12%, transparent)",
        pillText: "var(--destructive)",
        title: tr
          ? "Başvurun bu sefer onaylanamadı"
          : "Your application wasn't approved this time",
        body: tr
          ? "7 gün sonra yeni bir başvuru başlatabilirsin. Sorularını destek ekibine iletebilirsin."
          : "You can apply again after 7 days. Reach out to support if you have questions.",
        secondaryAction: {
          label: tr ? "Destek ile iletişime geç" : "Contact support",
          href: "/iletisim",
        },
      };
    default:
      return {
        pillLabel: status,
        pillBg: "var(--muted)",
        pillText: "var(--foreground)",
        title: tr ? "Başvuru durumu" : "Application status",
        body: tr
          ? "Başvurun şu an pasif görünüyor."
          : "Your application currently looks inactive.",
      };
  }
}
