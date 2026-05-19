import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowRight01Icon,
  CheckmarkBadge01Icon,
  LockPasswordIcon,
  MailAdd01Icon,
  Notification03Icon,
  Settings02Icon,
  UserEdit01Icon,
} from "@hugeicons/core-free-icons";

type IconType = typeof UserEdit01Icon;

import { Link } from "@/i18n/navigation";
import { type Locale } from "@/i18n/routing";
import { requireAuth } from "@/lib/auth/guards";
import { fetchAccountSummary } from "@/lib/account/server";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { cn } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "panel.settings" });
  return buildPageMetadata({
    locale,
    path: "/ayarlar",
    title: `${t("meta_title")} · LessonRadar`,
    description: t("meta_description"),
    noindex: true,
  });
}

interface PageProps {
  params: Promise<{ locale: Locale }>;
}

interface SectionCard {
  href: "/ayarlar/profil" | "/ayarlar/sifre" | "/ayarlar/bildirimler" | "/ayarlar/hesap";
  icon: IconType;
  titleKey:
    | "sections.profile.title"
    | "sections.password.title"
    | "sections.notifications.title"
    | "sections.account.title";
  descriptionKey:
    | "sections.profile.description"
    | "sections.password.description"
    | "sections.notifications.description"
    | "sections.account.description";
  status?: { tone: "success" | "warning" | "neutral"; label: string };
}

export default async function SettingsLandingPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Layout already gated auth; this call short-circuits when the cookie is
  // still good and lets us read the user shape for the welcome card.
  await requireAuth({ next: "/ayarlar" });

  const t = await getTranslations("panel.settings");
  const summary = await fetchAccountSummary();
  const completion =
    summary.kind === "ok" && summary.data.customer
      ? summary.data.customer.completion_percentage
      : null;
  const isEmailVerified =
    summary.kind === "ok" ? summary.data.profile.is_email_verified : true;

  const cards: SectionCard[] = [
    {
      href: "/ayarlar/profil",
      icon: UserEdit01Icon,
      titleKey: "sections.profile.title",
      descriptionKey: "sections.profile.description",
      status:
        completion !== null
          ? {
              tone:
                completion >= 80
                  ? "success"
                  : completion >= 40
                    ? "neutral"
                    : "warning",
              label: t("sections.profile.completion", { value: completion }),
            }
          : undefined,
    },
    {
      href: "/ayarlar/sifre",
      icon: LockPasswordIcon,
      titleKey: "sections.password.title",
      descriptionKey: "sections.password.description",
    },
    {
      href: "/ayarlar/bildirimler",
      icon: Notification03Icon,
      titleKey: "sections.notifications.title",
      descriptionKey: "sections.notifications.description",
    },
    {
      href: "/ayarlar/hesap",
      icon: Settings02Icon,
      titleKey: "sections.account.title",
      descriptionKey: "sections.account.description",
      status: isEmailVerified
        ? undefined
        : {
            tone: "warning",
            label: t("sections.account.email_unverified_pill"),
          },
    },
  ];

  return (
    <div className="space-y-6">
      {!isEmailVerified ? (
        <aside
          role="status"
          className="flex flex-col gap-3 rounded-2xl border border-action/30 bg-action/5 p-5 md:flex-row md:items-center md:justify-between"
        >
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-action/15 text-action-foreground">
              <HugeiconsIcon icon={MailAdd01Icon} size={20} strokeWidth={2} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">
                {t("email_unverified.title")}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {t("email_unverified.body")}
              </p>
            </div>
          </div>
          <Link
            href="/ayarlar/hesap"
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 self-start rounded-xl border border-action/40 bg-card px-4 text-sm font-semibold text-action-foreground transition-colors hover:bg-action/10 md:self-auto"
          >
            {t("email_unverified.cta")}
            <HugeiconsIcon icon={ArrowRight01Icon} size={14} strokeWidth={2.5} />
          </Link>
        </aside>
      ) : null}

      <section
        aria-labelledby="settings-sections-heading"
        className="space-y-4"
      >
        <h2
          id="settings-sections-heading"
          className="text-sm font-semibold uppercase tracking-wider text-muted-foreground"
        >
          {t("sections_heading")}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {cards.map((card) => (
            <SectionLink
              key={card.href}
              href={card.href}
              icon={card.icon}
              title={t(card.titleKey)}
              description={t(card.descriptionKey)}
              status={card.status}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

interface SectionLinkProps {
  href: SectionCard["href"];
  icon: IconType;
  title: string;
  description: string;
  status?: SectionCard["status"];
}

function SectionLink({
  href,
  icon,
  title,
  description,
  status,
}: SectionLinkProps) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-4 rounded-2xl border border-border bg-card p-5 shadow-card transition-shadow hover:shadow-elevated"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <HugeiconsIcon icon={icon} size={20} strokeWidth={2} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          {status ? <StatusPill {...status} /> : null}
        </div>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
      <HugeiconsIcon
        icon={ArrowRight01Icon}
        size={16}
        strokeWidth={2.5}
        className="mt-1 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
      />
    </Link>
  );
}

function StatusPill({
  tone,
  label,
}: NonNullable<SectionCard["status"]>) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        tone === "success" && "bg-success/15 text-success",
        tone === "warning" && "bg-action/15 text-action-foreground",
        tone === "neutral" && "bg-primary/10 text-primary",
      )}
    >
      {tone === "success" ? (
        <HugeiconsIcon
          icon={CheckmarkBadge01Icon}
          size={12}
          strokeWidth={2.5}
        />
      ) : null}
      {label}
    </span>
  );
}
