import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";

import { Container } from "@/components/layout/Container";
import { TeacherInboxList } from "@/components/panel-teacher/TeacherInboxList";
import { TeacherInboxQuotaStrip } from "@/components/panel-teacher/TeacherInboxQuotaStrip";
import { Link } from "@/i18n/navigation";
import { type Locale } from "@/i18n/routing";
import { requireAuth } from "@/lib/auth/guards";
import { fetchTeacherInbox } from "@/lib/teacher-leads/server";
import { buildPageMetadata } from "@/lib/seo/metadata";

/**
 * `/panel-ogretmen/talepler` — teacher lead inbox.
 *
 * - `force-dynamic`: payload is per-teacher, never CDN-cacheable.
 * - `noindex`: every teacher panel surface is private.
 * - `requireAuth({ role: ["teacher", "admin"] })`: customers get bounced
 *   to `/panel` via `roleHomepage()`.
 * - Network errors collapse to a soft state so the rest of the panel chrome
 *   stays usable.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale,
    namespace: "panel.teacher.inbox",
  });
  return buildPageMetadata({
    locale,
    path: "/panel-ogretmen/talepler",
    title: `${t("meta_title")} · LessonRadar`,
    description: t("meta_description"),
    noindex: true,
  });
}

interface PageProps {
  params: Promise<{ locale: Locale }>;
}

export default async function TeacherInboxPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  await requireAuth({
    role: ["teacher", "admin"],
    next: "/panel-ogretmen/talepler",
  });

  const outcome = await fetchTeacherInbox();
  if (!outcome.ok) {
    return <NetworkErrorState locale={locale} />;
  }

  const t = await getTranslations("panel.teacher.inbox");

  return (
    <Container className="py-8 md:py-12">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="space-y-1">
          <Link
            href="/panel-ogretmen"
            className="text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            ← {t("back_to_panel")}
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
            {t("title")}
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground md:text-base">
            {t("subtitle")}
          </p>
        </header>

        <TeacherInboxQuotaStrip quota={outcome.data.quota} />

        <TeacherInboxList
          rows={outcome.data.results}
          quota={outcome.data.quota}
          locale={locale}
        />
      </div>
    </Container>
  );
}

async function NetworkErrorState({ locale }: { locale: Locale }) {
  const t = await getTranslations({
    locale,
    namespace: "panel.teacher.inbox.empty",
  });
  return (
    <Container className="py-16">
      <div className="mx-auto max-w-xl space-y-4 rounded-2xl border border-border bg-card p-8 text-center shadow-card">
        <h1 className="text-xl font-semibold text-foreground">
          {t("network_error_title")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("network_error_body")}</p>
      </div>
    </Container>
  );
}
