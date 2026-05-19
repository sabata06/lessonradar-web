import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowRight01Icon,
  Settings02Icon,
  UserEdit01Icon,
} from "@hugeicons/core-free-icons";

import { Link } from "@/i18n/navigation";
import type {
  AccountCustomerProfilePayload,
  AccountProfilePayload,
} from "@/lib/account/types";
import { cn } from "@/lib/utils";

interface Props {
  profile: AccountProfilePayload;
  customer: AccountCustomerProfilePayload | null;
}

/**
 * /panel üst kart — avatar + isim + email + tamamlanma çubuğu + "Profili
 * düzenle" link. Mobile app'in CustomerSettings ekranındaki profile card'a
 * paralel, web bağlamına uyarlandı (settings entry as a CTA, not a
 * tap-anywhere card).
 */
export async function CustomerMiniProfile({ profile, customer }: Props) {
  const t = await getTranslations("panel.customer.mini");
  const displayName =
    [profile.first_name, profile.last_name].filter(Boolean).join(" ") ||
    profile.email.split("@")[0];
  const avatarUrl =
    customer?.profile_image_url ?? profile.profile_image_url ?? profile.avatar_url;
  const initials = displayName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
  const completion = customer?.completion_percentage ?? null;

  const tone =
    completion === null
      ? "muted"
      : completion >= 80
        ? "success"
        : completion >= 40
          ? "brand"
          : "warning";

  return (
    <section
      aria-labelledby="customer-mini-heading"
      className="overflow-hidden rounded-2xl border border-border bg-card shadow-card"
    >
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:p-6">
        <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt=""
              width={64}
              height={64}
              className="size-full object-cover"
            />
          ) : initials ? (
            <span className="text-xl font-semibold text-primary">
              {initials}
            </span>
          ) : null}
        </div>

        <div className="min-w-0 flex-1 space-y-1">
          <h2
            id="customer-mini-heading"
            className="truncate text-base font-semibold text-foreground"
          >
            {displayName}
          </h2>
          <p className="truncate text-xs text-muted-foreground">
            {profile.email}
          </p>
          {completion !== null ? (
            <div className="mt-2 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  {t("completion_label")}
                </span>
                <span
                  className={cn(
                    "font-semibold",
                    tone === "success" && "text-success",
                    tone === "brand" && "text-primary",
                    tone === "warning" && "text-action-foreground",
                  )}
                >
                  %{completion}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full rounded-full transition-[width]",
                    tone === "success" && "bg-success",
                    tone === "brand" && "bg-primary",
                    tone === "warning" && "bg-action",
                  )}
                  style={{ width: `${Math.max(0, Math.min(100, completion))}%` }}
                  aria-hidden="true"
                />
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 sm:items-end">
          <Link
            href="/ayarlar/profil"
            className="inline-flex h-10 items-center gap-2 self-stretch rounded-xl border border-primary/30 bg-card px-4 text-sm font-semibold text-primary transition-colors hover:bg-primary/5 sm:self-auto"
          >
            <HugeiconsIcon icon={UserEdit01Icon} size={16} strokeWidth={2} />
            <span>{t("edit_profile")}</span>
            <HugeiconsIcon
              icon={ArrowRight01Icon}
              size={14}
              strokeWidth={2.5}
            />
          </Link>
          <Link
            href="/ayarlar"
            className="inline-flex h-10 items-center gap-2 self-stretch rounded-xl px-4 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground sm:self-auto"
          >
            <HugeiconsIcon icon={Settings02Icon} size={16} strokeWidth={2} />
            <span>{t("settings")}</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
