import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Container } from "./Container";
import { Logo } from "./Logo";
import { fetchAllDisciplines, fetchCities } from "@/lib/data/api/marketplace";
import { toPseoDisciplinePathSlug } from "@/lib/seo/pseo-slugs";

export async function Footer() {
  const t = await getTranslations();
  const year = new Date().getFullYear();

  const [citiesEnvelope, disciplinesEnvelope] = await Promise.all([
    fetchCities(),
    fetchAllDisciplines(),
  ]);
  const priorityCities = citiesEnvelope.results.filter((c) => c.is_priority);
  const featuredDisciplines = disciplinesEnvelope.results.filter(
    (d) => d.is_featured,
  );

  return (
    <footer className="mt-24 border-t border-border bg-card">
      <Container className="grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-4">
          <Logo />
          <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
            {t("common.tagline")}
          </p>
        </div>

        <FooterColumn title={t("footer.popular_cities")}>
          {priorityCities.map((c) => (
            <FooterLink key={c.slug} href={`/${c.slug}`}>
              {c.name_tr}
            </FooterLink>
          ))}
        </FooterColumn>

        <FooterColumn title={t("footer.popular_subjects")}>
          {featuredDisciplines.map((d) => (
            <FooterLink
              key={d.slug}
              href={`/gaziantep/${toPseoDisciplinePathSlug(d.slug)}`}
            >
              {d.name_tr}
            </FooterLink>
          ))}
        </FooterColumn>

        <FooterColumn title={t("footer.for_teachers")}>
          <FooterLink href="/ogretmen-ol">{t("nav.become_teacher")}</FooterLink>
          <FooterLink href="/fiyatlar">{t("nav.pricing")}</FooterLink>
          <FooterLink href="/yasal/kvkk">{t("footer.kvkk")}</FooterLink>
          <FooterLink href="/yasal/gizlilik">{t("footer.privacy")}</FooterLink>
          <FooterLink href="/yasal/kosullar">{t("footer.terms")}</FooterLink>
        </FooterColumn>
      </Container>

      <div className="border-t border-border">
        <Container className="flex flex-col items-start justify-between gap-3 py-5 text-xs text-muted-foreground sm:flex-row sm:items-center">
          <span>{t("footer.rights", { year })}</span>
          <Link href="/iletisim" className="font-medium text-foreground hover:underline">
            {t("footer.contact")}
          </Link>
        </Container>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <ul className="space-y-2">{children}</ul>
    </div>
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
