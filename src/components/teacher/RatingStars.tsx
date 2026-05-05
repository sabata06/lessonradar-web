import { useId } from "react";
import { cn } from "@/lib/utils";

interface RatingStarsProps {
  value: number;        // 0..5
  size?: "sm" | "md";
  className?: string;
  ariaLabel?: string;
}

/**
 * Inline SVG stars — no icon font, no client JS, deterministic SSR output.
 * Gold (amber) per DESIGN.md; uses --color-gold token.
 *
 * Uses React.useId() so multiple stars on the same page (and the same value)
 * never collide on DOM IDs — collision breaks the SVG gradient mask.
 */
export function RatingStars({
  value,
  size = "sm",
  className,
  ariaLabel,
}: RatingStarsProps) {
  const reactId = useId();
  const gradientId = `stars-mask-${reactId}`;
  const clamped = Math.max(0, Math.min(5, value));
  const fillPct = (clamped / 5) * 100;
  const dim = size === "sm" ? 14 : 18;

  return (
    <span
      className={cn("inline-flex items-center", className)}
      aria-label={ariaLabel ?? `Puan: ${clamped.toFixed(1)} / 5`}
      role="img"
    >
      <svg
        width={dim * 5}
        height={dim}
        viewBox="0 0 80 16"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <defs>
          <linearGradient id={gradientId}>
            <stop offset={`${fillPct}%`} stopColor="var(--color-gold)" />
            <stop offset={`${fillPct}%`} stopColor="var(--color-border)" />
          </linearGradient>
        </defs>
        <g fill={`url(#${gradientId})`}>
          {[0, 16, 32, 48, 64].map((x) => (
            <path
              key={x}
              transform={`translate(${x} 0)`}
              d="M8 1.2l1.96 4.18 4.54.5-3.4 3.16.94 4.5L8 11.3l-4.04 2.24.94-4.5L1.5 5.88l4.54-.5L8 1.2z"
            />
          ))}
        </g>
      </svg>
    </span>
  );
}
