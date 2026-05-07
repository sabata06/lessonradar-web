import { useTranslations } from "next-intl";

import type { TeacherProfile } from "@/lib/types";

interface ProfileBioProps {
  teacher: TeacherProfile;
}

/**
 * Bio section. Long-form prose with comfortable measure (max-w-prose-ish)
 * and 1.6 line-height per DESIGN.md. No expand/collapse — the bio is
 * already short in mock data, and we'd rather show the whole thing than
 * hide it behind interaction. If bios grow long in production, add a
 * server-paginated continuation rather than a client-side toggle.
 */
export function ProfileBio({ teacher }: ProfileBioProps) {
  const t = useTranslations("profile.bio");
  return (
    <section
      aria-labelledby="profile-bio-title"
      className="rounded-2xl border border-border bg-card p-5 shadow-card sm:p-6"
    >
      <h2
        id="profile-bio-title"
        className="text-lg font-semibold text-foreground sm:text-xl"
      >
        {t("title")}
      </h2>
      <p className="mt-3 max-w-[68ch] whitespace-pre-line text-base leading-relaxed text-foreground/90">
        {teacher.bio}
      </p>
    </section>
  );
}
