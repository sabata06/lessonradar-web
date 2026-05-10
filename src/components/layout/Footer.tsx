import { getTranslations } from "next-intl/server";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";

import { Link } from "@/i18n/navigation";
import { Container } from "./Container";
import { Logo } from "./Logo";
import { fetchAllDisciplines, fetchCities } from "@/lib/data/api/marketplace";
import { toPseoDisciplinePathSlug } from "@/lib/seo/pseo-slugs";

const FOOTER_CITY_LIMIT = 8;
const FOOTER_DISCIPLINE_LIMIT = 8;

export async function Footer() {
  const t = await getTranslations();
  const year = new Date().getFullYear();

  const [citiesEnvelope, disciplinesEnvelope] = await Promise.all([
    fetchCities(),
    fetchAllDisciplines(),
  ]);

  const totalCityCount = citiesEnvelope.results.length;
  const cityRows = citiesEnvelope.results
    .filter((c) => c.is_priority)
    .slice(0, FOOTER_CITY_LIMIT);

  const totalDisciplineCount = disciplinesEnvelope.results.length;
  const disciplineRows = disciplinesEnvelope.results
    .filter((d) => d.is_featured)
    .slice(0, FOOTER_DISCIPLINE_LIMIT);

  const groups: FooterGroup[] = [
    {
      id: "discover",
      title: t("footer.discover"),
      links: cityRows.map((c) => ({ key: c.slug, href: `/${c.slug}`, label: c.name_tr })),
      moreHref: "/sehirler",
      moreLabel: t("footer.all_cities", { count: totalCityCount }),
    },
    {
      id: "subjects",
      title: t("footer.subjects"),
      links: disciplineRows.map((d) => ({
        key: d.slug,
        href: `/gaziantep/${toPseoDisciplinePathSlug(d.slug)}`,
        label: d.name_tr,
      })),
      moreHref: "/dersler",
      moreLabel: t("footer.all_subjects", { count: totalDisciplineCount }),
    },
    {
      id: "teachers",
      title: t("footer.for_teachers"),
      links: [
        { key: "become", href: "/ogretmen-ol", label: t("nav.become_teacher") },
        { key: "pricing", href: "/fiyatlar", label: t("nav.pricing") },
        { key: "contact", href: "/iletisim", label: t("footer.contact") },
      ],
    },
    {
      id: "legal",
      title: t("footer.legal"),
      links: [
        { key: "kvkk", href: "/yasal/kvkk", label: t("footer.kvkk") },
        { key: "privacy", href: "/yasal/gizlilik", label: t("footer.privacy") },
        { key: "terms", href: "/yasal/kosullar", label: t("footer.terms") },
      ],
    },
  ];

  return (
    <footer className="mt-24 border-t border-border bg-card">
      <Container className="py-12">
        <div className="flex flex-col gap-3 pb-10 sm:max-w-md">
          <Logo />
          <p className="text-sm leading-relaxed text-muted-foreground">
            {t("common.tagline")}
          </p>
        </div>

        <div className="hidden gap-10 border-t border-border pt-10 sm:grid sm:grid-cols-2 lg:grid-cols-4">
          {groups.map((g) => (
            <FooterColumn key={g.id} group={g} />
          ))}
        </div>

        <div className="border-t border-border sm:hidden">
          {groups.map((g) => (
            <FooterAccordion key={g.id} group={g} />
          ))}
        </div>
      </Container>

      <div className="border-t border-border">
        <Container className="flex flex-col items-start justify-between gap-3 py-5 text-xs text-muted-foreground sm:flex-row sm:items-center">
          <span>{t("footer.rights", { year })}</span>
          <Link
            href="/iletisim"
            className="font-medium text-foreground hover:underline"
          >
            {t("footer.contact")}
          </Link>
        </Container>
      </div>
    </footer>
  );
}

interface FooterLinkItem {
  key: string;
  href: string;
  label: string;
}

interface FooterGroup {
  id: string;
  title: string;
  links: FooterLinkItem[];
  moreHref?: string;
  moreLabel?: string;
}

function FooterColumn({ group }: { group: FooterGroup }) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">{group.title}</h3>
      <ul className="space-y-1">
        {group.links.map((l) => (
          <FooterLink key={l.key} href={l.href}>
            {l.label}
          </FooterLink>
        ))}
        {group.moreHref && group.moreLabel ? (
          <FooterMoreLink href={group.moreHref}>{group.moreLabel}</FooterMoreLink>
        ) : null}
      </ul>
    </div>
  );
}

function FooterAccordion({ group }: { group: FooterGroup }) {
  return (
    <details className="group border-b border-border last:border-b-0">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between py-3 text-sm font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50">
        {group.title}
        <HugeiconsIcon
          icon={ArrowRight01Icon}
          size={16}
          strokeWidth={2}
          className="text-muted-foreground transition-transform duration-200 motion-reduce:transition-none group-open:rotate-90"
        />
      </summary>
      <ul className="pb-3">
        {group.links.map((l) => (
          <FooterLink key={l.key} href={l.href}>
            {l.label}
          </FooterLink>
        ))}
        {group.moreHref && group.moreLabel ? (
          <FooterMoreLink href={group.moreHref}>{group.moreLabel}</FooterMoreLink>
        ) : null}
      </ul>
    </details>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link
        href={href}
        className="-mx-2 inline-flex min-h-11 items-center rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        {children}
      </Link>
    </li>
  );
}

function FooterMoreLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link
        href={href}
        className="-mx-2 inline-flex min-h-11 items-center gap-1 rounded-md px-2 py-1.5 text-sm font-medium text-brand transition-colors hover:text-brand/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        {children}
        <HugeiconsIcon icon={ArrowRight01Icon} size={14} strokeWidth={2.5} />
      </Link>
    </li>
  );
}
