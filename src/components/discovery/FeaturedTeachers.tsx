import { getTranslations } from "next-intl/server";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";

import { Link } from "@/i18n/navigation";
import { TeacherCard } from "@/components/teacher/TeacherCard";
import type { SupportedLocale, TeacherProfile } from "@/lib/types";

interface FeaturedTeachersProps {
  locale: SupportedLocale;
  nowIso: string;
  teachers: TeacherProfile[];
  seeAllHref: string;
}

export async function FeaturedTeachers({
  locale,
  nowIso,
  teachers,
  seeAllHref,
}: FeaturedTeachersProps) {
  const t = await getTranslations("home.featured");

  return (
    <section aria-labelledby="featured-heading" className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div className="max-w-2xl space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand">
            {t("kicker")}
          </p>
          <h2
            id="featured-heading"
            className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
          >
            {t("title")}
          </h2>
          <p className="text-sm text-muted-foreground sm:text-base">
            {t("description")}
          </p>
        </div>
        <Link
          href={seeAllHref}
          className="hidden shrink-0 items-center gap-1 text-sm font-medium text-brand hover:underline sm:inline-flex"
        >
          {t("see_all")}
          <HugeiconsIcon icon={ArrowRight01Icon} size={14} strokeWidth={2} />
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {teachers.map((teacher) => (
          <TeacherCard
            key={teacher.id}
            teacher={teacher}
            locale={locale}
            nowIso={nowIso}
          />
        ))}
      </div>

      <div className="sm:hidden">
        <Link
          href={seeAllHref}
          className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline"
        >
          {t("see_all")}
          <HugeiconsIcon icon={ArrowRight01Icon} size={14} strokeWidth={2} />
        </Link>
      </div>
    </section>
  );
}
