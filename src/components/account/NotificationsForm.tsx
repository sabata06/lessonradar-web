"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Alert02Icon,
  CheckmarkCircle02Icon,
  Notification03Icon,
  Time04Icon,
} from "@hugeicons/core-free-icons";

import { BrandCombobox } from "@/components/ui/brand-combobox";
import { updateNotificationsRequest } from "@/lib/account/client";
import type {
  AccountNotificationPayload,
  NotificationsUpdatePayload,
} from "@/lib/account/types";
import { cn } from "@/lib/utils";

interface Props {
  initial: AccountNotificationPayload;
}

type ToggleKey =
  | "push_notifications_enabled"
  | "lesson_updates_enabled"
  | "lesson_change_updates_enabled"
  | "enrollment_updates_enabled"
  | "quiet_hours_enabled";

interface FlashState {
  tone: "success" | "error";
  message: string;
}

export function NotificationsForm({ initial }: Props) {
  const t = useTranslations("panel.settings.notifications");
  const tErrors = useTranslations("account.errors");
  const [prefs, setPrefs] = useState<AccountNotificationPayload>(initial);
  const [flash, setFlash] = useState<FlashState | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const hourOptions = useMemo(
    () =>
      Array.from({ length: 24 }, (_, hour) => {
        const padded = hour.toString().padStart(2, "0");
        return { value: `${padded}:00`, label: `${padded}:00` };
      }),
    [],
  );

  async function commitChange(
    fieldKey: string,
    payload: NotificationsUpdatePayload,
    optimistic: AccountNotificationPayload,
  ) {
    const previous = prefs;
    setPrefs(optimistic);
    setBusyKey(fieldKey);
    setFlash(null);

    const result = await updateNotificationsRequest(payload);
    if (!result.ok) {
      setPrefs(previous);
      setFlash({
        tone: "error",
        message: tErrors.has(result.code)
          ? tErrors(result.code)
          : tErrors("unknown"),
      });
      setBusyKey(null);
      return;
    }
    setPrefs(result.data);
    setFlash({ tone: "success", message: t("status.saved") });
    setBusyKey(null);
    // Auto-dismiss the success flash so the surface stays calm.
    window.setTimeout(() => {
      setFlash((current) =>
        current?.tone === "success" ? null : current,
      );
    }, 2500);
  }

  function onToggle(key: ToggleKey, next: boolean) {
    void commitChange(
      key,
      { [key]: next } as NotificationsUpdatePayload,
      { ...prefs, [key]: next },
    );
  }

  function onQuietTime(field: "quiet_hours_start" | "quiet_hours_end", next: string) {
    void commitChange(
      field,
      { [field]: next } as NotificationsUpdatePayload,
      { ...prefs, [field]: next },
    );
  }

  const pushEnabled = prefs.push_notifications_enabled;

  return (
    <div className="space-y-5">
      <section
        aria-labelledby="notifications-general-heading"
        className="rounded-2xl border border-border bg-card p-5 shadow-card sm:p-6"
      >
        <SectionHeading
          icon={Notification03Icon}
          id="notifications-general-heading"
          title={t("sections.general.title")}
          description={t("sections.general.description")}
        />
        <ToggleRow
          title={t("toggles.push.title")}
          description={t("toggles.push.description")}
          checked={pushEnabled}
          busy={busyKey === "push_notifications_enabled"}
          onChange={(next) => onToggle("push_notifications_enabled", next)}
        />
      </section>

      <section
        aria-labelledby="notifications-updates-heading"
        className={cn(
          "rounded-2xl border border-border bg-card p-5 shadow-card transition-opacity sm:p-6",
          !pushEnabled && "opacity-60",
        )}
      >
        <SectionHeading
          icon={Notification03Icon}
          id="notifications-updates-heading"
          title={t("sections.updates.title")}
          description={t("sections.updates.description")}
        />
        <div className="divide-y divide-border">
          <ToggleRow
            title={t("toggles.lesson_updates.title")}
            description={t("toggles.lesson_updates.description")}
            checked={prefs.lesson_updates_enabled}
            disabled={!pushEnabled}
            busy={busyKey === "lesson_updates_enabled"}
            onChange={(next) => onToggle("lesson_updates_enabled", next)}
          />
          <ToggleRow
            title={t("toggles.lesson_change_updates.title")}
            description={t("toggles.lesson_change_updates.description")}
            checked={prefs.lesson_change_updates_enabled}
            disabled={!pushEnabled}
            busy={busyKey === "lesson_change_updates_enabled"}
            onChange={(next) => onToggle("lesson_change_updates_enabled", next)}
          />
          <ToggleRow
            title={t("toggles.enrollment_updates.title")}
            description={t("toggles.enrollment_updates.description")}
            checked={prefs.enrollment_updates_enabled}
            disabled={!pushEnabled}
            busy={busyKey === "enrollment_updates_enabled"}
            onChange={(next) => onToggle("enrollment_updates_enabled", next)}
          />
        </div>
      </section>

      <section
        aria-labelledby="notifications-quiet-heading"
        className={cn(
          "rounded-2xl border border-border bg-card p-5 shadow-card transition-opacity sm:p-6",
          !pushEnabled && "opacity-60",
        )}
      >
        <SectionHeading
          icon={Time04Icon}
          id="notifications-quiet-heading"
          title={t("sections.quiet.title")}
          description={t("sections.quiet.description")}
        />
        <ToggleRow
          title={t("toggles.quiet.title")}
          description={t("toggles.quiet.description")}
          checked={prefs.quiet_hours_enabled}
          disabled={!pushEnabled}
          busy={busyKey === "quiet_hours_enabled"}
          onChange={(next) => onToggle("quiet_hours_enabled", next)}
        />
        {prefs.quiet_hours_enabled ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="space-y-1.5">
              <span className="text-sm font-medium text-foreground">
                {t("fields.quiet_start.label")}
              </span>
              <BrandCombobox
                value={prefs.quiet_hours_start.slice(0, 5)}
                onChange={(next) => onQuietTime("quiet_hours_start", next)}
                options={hourOptions}
                placeholder="22:00"
                ariaLabel={t("fields.quiet_start.label")}
                disabled={!pushEnabled || busyKey !== null}
                triggerClassName="h-11 rounded-xl"
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-sm font-medium text-foreground">
                {t("fields.quiet_end.label")}
              </span>
              <BrandCombobox
                value={prefs.quiet_hours_end.slice(0, 5)}
                onChange={(next) => onQuietTime("quiet_hours_end", next)}
                options={hourOptions}
                placeholder="07:00"
                ariaLabel={t("fields.quiet_end.label")}
                disabled={!pushEnabled || busyKey !== null}
                triggerClassName="h-11 rounded-xl"
              />
            </label>
          </div>
        ) : null}
      </section>

      {flash ? (
        <div
          role="status"
          aria-live="polite"
          className={cn(
            "flex items-start gap-3 rounded-xl border p-3 text-sm",
            flash.tone === "success"
              ? "border-success/30 bg-success/5 text-success"
              : "border-destructive/30 bg-destructive/5 text-destructive",
          )}
        >
          <HugeiconsIcon
            icon={
              flash.tone === "success" ? CheckmarkCircle02Icon : Alert02Icon
            }
            size={16}
            strokeWidth={2}
            className="mt-0.5 shrink-0"
          />
          <span>{flash.message}</span>
        </div>
      ) : null}
    </div>
  );
}

function SectionHeading({
  icon,
  id,
  title,
  description,
}: {
  icon: Parameters<typeof HugeiconsIcon>[0]["icon"];
  id: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-4 flex items-start gap-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <HugeiconsIcon icon={icon} size={18} strokeWidth={2} />
      </span>
      <div className="min-w-0">
        <h2 id={id} className="text-sm font-semibold text-foreground">
          {title}
        </h2>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
    </div>
  );
}

interface ToggleRowProps {
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  busy?: boolean;
  onChange: (next: boolean) => void;
}

function ToggleRow({
  title,
  description,
  checked,
  disabled,
  busy,
  onChange,
}: ToggleRowProps) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-busy={busy ? true : undefined}
        disabled={disabled || busy}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed",
          checked ? "bg-primary" : "bg-muted",
          disabled && "opacity-50",
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            "inline-block size-5 rounded-full bg-card shadow transition-transform",
            checked ? "translate-x-5" : "translate-x-0.5",
          )}
        />
      </button>
    </div>
  );
}
