import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  withWordmark?: boolean;
}

export function Logo({ className, withWordmark = true }: LogoProps) {
  return (
    <Link
      href="/"
      aria-label="LessonRadar"
      className={cn(
        "inline-flex items-center gap-2 font-semibold tracking-tight text-foreground",
        className,
      )}
    >
      <span
        aria-hidden
        className="grid size-8 place-items-center rounded-xl bg-brand text-primary-foreground shadow-action"
      >
        <svg viewBox="0 0 24 24" fill="none" className="size-4" aria-hidden>
          <path
            d="M12 2L4 6v6c0 5 3.5 9.5 8 10 4.5-.5 8-5 8-10V6l-8-4z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <circle cx="12" cy="11" r="2.5" fill="currentColor" />
        </svg>
      </span>
      {withWordmark && (
        <span className="text-lg leading-none">
          Lesson<span className="text-brand">Radar</span>
        </span>
      )}
    </Link>
  );
}
