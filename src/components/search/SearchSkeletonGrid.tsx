/**
 * Skeleton fallback for `<SearchResults>` while the server fetches the
 * teacher list. Six cards is enough to fill the typical desktop grid
 * (3 columns × 2 rows) and degrades gracefully on mobile (1 column).
 */
export function SearchSkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <ul
      className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
      aria-busy
      aria-label="Loading"
    >
      {Array.from({ length: count }).map((_, i) => (
        <li
          key={i}
          className="animate-pulse rounded-2xl border border-border bg-card p-5 shadow-card"
        >
          <div className="flex items-center gap-3">
            <div className="size-14 shrink-0 rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/5 rounded bg-muted" />
              <div className="h-3 w-2/5 rounded bg-muted" />
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <div className="h-3 w-full rounded bg-muted" />
            <div className="h-3 w-11/12 rounded bg-muted" />
            <div className="h-3 w-3/4 rounded bg-muted" />
          </div>
          <div className="mt-5 flex items-center gap-2">
            <div className="h-6 w-16 rounded-full bg-muted" />
            <div className="h-6 w-20 rounded-full bg-muted" />
          </div>
          <div className="mt-4 flex items-center justify-between">
            <div className="h-4 w-20 rounded bg-muted" />
            <div className="h-9 w-24 rounded-xl bg-muted" />
          </div>
        </li>
      ))}
    </ul>
  );
}
