"use client";

import { useAuth } from "@/lib/auth/client";

/**
 * Renders its children only after the auth state hydrates AND confirms
 * the visitor is not a teacher.
 *
 * Why hide-by-default (vs show-by-default):
 *   The teacher is the harmed party — they should never see a "become a
 *   tutor" CTA that is theirs to ignore. Showing the link in SSR and
 *   hiding it on hydration creates a visible flash for teachers (the user
 *   group we are protecting). Reversing the gate produces a brief reveal
 *   for anon + customer visitors instead, which is far less attention-
 *   grabbing because nothing is being "taken away".
 *
 * Best practice note:
 *   The textbook fix is Next 16 Partial Prerendering — read `cookies()`
 *   as a Promise inside a `<Suspense>` boundary so the static shell
 *   prerenders and the auth-aware slot streams in role-resolved markup.
 *   That requires `experimental.ppr` (a.k.a. `cacheComponents`), which
 *   conflicts with our current caching-model and per-route runtime/dynamic
 *   segment configs (handoff 2026-05-08 + §6 Open decisions — PPR
 *   migration deferred). Until that lands, hide-by-default is the
 *   correct pragmatic choice: no flash for teachers, sub-frame reveal
 *   for everyone else, link still in the internal link graph via Footer
 *   + sitemap + pSEO grid for crawl signal.
 *
 * SEO note:
 *   The link is absent from initial SSR HTML. Google + Bing render JS
 *   before indexing, so they will see the link after hydration. The link
 *   also appears in the static Footer column (HideForTeachers wraps that
 *   instance too — but only the Header instance is above the fold for a
 *   crawler peeking at the first chunk), in the sitemap, and on the
 *   /ogretmen-ol landing — crawl signal is preserved.
 */
export function HideForTeachers({ children }: { children: React.ReactNode }) {
  const { user, isHydrated } = useAuth();
  if (!isHydrated) return null;
  if (user?.role === "teacher") return null;
  return <>{children}</>;
}
