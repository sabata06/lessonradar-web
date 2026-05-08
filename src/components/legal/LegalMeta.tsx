import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";

interface LegalMetaProps {
  version: string;
  contactEmail: string;
}

/**
 * Editorial meta strip rendered just under the page title. Three pieces:
 * version label, contact mailto, and a thin separator. We deliberately
 * don't show a "last updated" date here — the document body itself
 * carries the effective date language ("X tarihinde yürürlüğe girdi"),
 * and surfacing two date sources risks contradiction when the backend
 * doc is re-published without a header refresh.
 */
export function LegalMeta({ version, contactEmail }: LegalMetaProps) {
  const t = useTranslations("legal.meta");

  return (
    <div className="mb-10 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
      <span>{t("version", { version })}</span>
      <span aria-hidden="true" className="size-1 rounded-full bg-border" />
      <Link
        href={`mailto:${contactEmail}`}
        className="text-brand underline-offset-4 hover:underline"
      >
        {t("contact_label", { email: contactEmail })}
      </Link>
    </div>
  );
}
