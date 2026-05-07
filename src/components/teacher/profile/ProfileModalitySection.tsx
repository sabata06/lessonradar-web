import { useTranslations } from "next-intl";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Home01Icon,
  MapsLocation01Icon,
  OnlineLearning01Icon,
} from "@hugeicons/core-free-icons";

import { cn } from "@/lib/utils";
import type { City, District, TeacherProfile } from "@/lib/types";
import { deriveModalities } from "@/lib/data/profile";

interface ProfileModalitySectionProps {
  teacher: TeacherProfile;
  city: City | undefined;
  district: District | undefined;
  cityName: string;
  districtName: string;
}

/**
 * Modality + location panel. Three notes:
 *  1. We render explicit "verir / does not" pills rather than a single
 *     ambiguous tag — parents scan profiles at speed and need binary
 *     answers.
 *  2. Hybrid prints both pills active plus an explanatory line.
 *  3. Service-area copy is the city/district pair; future district-level
 *     mapping can turn this into a proper polygon hint.
 */
export function ProfileModalitySection({
  teacher,
  city,
  district,
  cityName,
  districtName,
}: ProfileModalitySectionProps) {
  const t = useTranslations("profile.modality");
  const { inPerson, online } = deriveModalities(teacher);
  const isHybrid = teacher.modality === "hybrid";

  return (
    <section
      aria-labelledby="profile-modality-title"
      className="rounded-2xl border border-border bg-card p-5 shadow-card sm:p-6"
    >
      <h2
        id="profile-modality-title"
        className="text-lg font-semibold text-foreground sm:text-xl"
      >
        {t("title")}
      </h2>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <ModalityPill
          active={inPerson}
          icon={
            <HugeiconsIcon icon={Home01Icon} size={20} strokeWidth={2} />
          }
          label={t("in_person")}
        />
        <ModalityPill
          active={online}
          icon={
            <HugeiconsIcon icon={OnlineLearning01Icon} size={20} strokeWidth={2} />
          }
          label={t("online")}
        />
      </div>

      {isHybrid && (
        <p className="mt-3 text-xs text-muted-foreground">{t("hybrid_note")}</p>
      )}

      {(city || district) && (
        <dl className="mt-5 space-y-2 border-t border-border pt-4 text-sm">
          <div className="flex items-start gap-2">
            <dt className="inline-flex size-5 shrink-0 items-center justify-center text-muted-foreground">
              <HugeiconsIcon
                icon={MapsLocation01Icon}
                size={14}
                strokeWidth={2}
                aria-hidden
              />
            </dt>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t("location_label")}
              </p>
              <p className="mt-0.5 text-foreground">
                {districtName
                  ? t("location_value", {
                      district: districtName,
                      city: cityName,
                    })
                  : t("location_value_no_district", { city: cityName })}
              </p>
            </div>
          </div>
        </dl>
      )}
    </section>
  );
}

function ModalityPill({
  active,
  icon,
  label,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border px-4 py-3",
        active
          ? "border-success/30 bg-success-soft/40 text-foreground"
          : "border-border bg-muted/40 text-muted-foreground line-through opacity-60",
      )}
      aria-disabled={!active}
    >
      <span
        aria-hidden
        className={cn(
          "grid size-9 place-items-center rounded-lg",
          active ? "bg-success-soft text-success" : "bg-muted text-muted-foreground",
        )}
      >
        {icon}
      </span>
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}
