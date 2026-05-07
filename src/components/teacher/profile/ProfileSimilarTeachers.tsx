import { useTranslations } from "next-intl";

import { TeacherCard } from "../TeacherCard";
import type { City, SupportedLocale, TeacherProfile } from "@/lib/types";

interface ProfileSimilarTeachersProps {
  teachers: TeacherProfile[];
  city: City | undefined;
  locale: SupportedLocale;
  nowIso: string;
}

/**
 * "Same city, related subject" rail. Reuses the existing compact
 * TeacherCard variant so the design system stays consistent. We render
 * up to 4 teachers (already sliced upstream) — fewer than 4 collapses
 * gracefully into a 1- or 2-column layout.
 */
export function ProfileSimilarTeachers({
  teachers,
  city,
  locale,
  nowIso,
}: ProfileSimilarTeachersProps) {
  const t = useTranslations("profile.similar");
  if (teachers.length === 0) return null;
  const cityName = city ? (locale === "tr" ? city.nameTr : city.nameEn) : "";

  return (
    <section
      aria-labelledby="profile-similar-title"
      className="space-y-4"
    >
      <header>
        <h2
          id="profile-similar-title"
          className="text-lg font-semibold text-foreground sm:text-xl"
        >
          {t("title", { city: cityName })}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
      </header>

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {teachers.map((teacher) => (
          <li key={teacher.id}>
            <TeacherCard
              teacher={teacher}
              locale={locale}
              nowIso={nowIso}
              variant="compact"
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
