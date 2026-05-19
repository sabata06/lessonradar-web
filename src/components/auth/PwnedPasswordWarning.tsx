"use client";

import { useTranslations } from "next-intl";
import { HugeiconsIcon } from "@hugeicons/react";
import { Alert02Icon } from "@hugeicons/core-free-icons";

interface Props {
  /** Result from `usePwnedPasswordCheck`. */
  count: number | null;
}

/**
 * Inline warning for passwords found in known breach corpora.
 *
 * Renders nothing for `count === null` (unchecked / network blip) and
 * `count === 0` (clean) — silent success matches the NIST 800-63B guidance
 * to never confirm a password is safe.
 *
 * Tone is yellow-action (warning), not destructive — this is advisory, not
 * a block. Users can still submit; we just tell them the truth.
 */
export function PwnedPasswordWarning({ count }: Props) {
  const t = useTranslations("auth.pwned");
  if (count === null || count <= 0) return null;

  return (
    <p
      role="alert"
      aria-live="polite"
      className="mt-1.5 flex items-start gap-1.5 rounded-md border border-action/30 bg-action/5 px-2.5 py-1.5 text-xs leading-snug text-action-foreground"
    >
      <HugeiconsIcon
        icon={Alert02Icon}
        size={12}
        strokeWidth={2.5}
        className="mt-0.5 shrink-0"
      />
      <span>
        {t("warning", { count: formatCount(count) })}
      </span>
    </p>
  );
}

function formatCount(n: number): string {
  return n.toLocaleString("tr-TR");
}
