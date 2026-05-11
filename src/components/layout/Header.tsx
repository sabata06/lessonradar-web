import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { HideForTeachers } from "@/components/auth/HideForTeachers";

import { Container } from "./Container";
import { HeaderAuth } from "./HeaderAuth";
import { Logo } from "./Logo";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { MobileMenu } from "./MobileMenu";

export async function Header() {
  const t = await getTranslations();

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-md supports-[backdrop-filter]:bg-background/70">
      <Container className="flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-8">
          <Logo />
          <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
            <NavItem href="/ara">{t("nav.discover")}</NavItem>
            <HideForTeachers>
              <NavItem href="/ogretmen-ol">{t("nav.become_teacher")}</NavItem>
            </HideForTeachers>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden lg:block">
            <LocaleSwitcher />
          </div>

          <HeaderAuth />

          <Button
            asChild
            className="hidden bg-action text-action-foreground shadow-action transition-colors hover:bg-action-hover focus-visible:ring-action/40 lg:inline-flex"
          >
            <Link href="/ders-talebi">{t("cta.request_lesson")}</Link>
          </Button>

          <MobileMenu />
        </div>
      </Container>
    </header>
  );
}

function NavItem({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      {children}
    </Link>
  );
}
