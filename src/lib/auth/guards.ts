import "server-only";

import { redirect } from "next/navigation";

import { getSession } from "./cookies";
import type { SafeUser, UserRole } from "./server";

interface RequireAuthOptions {
  /**
   * Role gate. If set and the authenticated user doesn't match, the user is
   * redirected to the role-appropriate fallback (or `/` for unknown roles).
   *
   * Use the array form to allow multiple roles (e.g. ["admin", "teacher"]).
   */
  role?: UserRole | UserRole[];
  /**
   * Where to send unauthenticated visitors. The current page is appended as
   * `?next=` so we bounce them back after sign-in. Defaults to `/giris`.
   */
  loginPath?: string;
  /**
   * Path to bounce *to* after a successful login. If omitted the caller's path
   * must be threaded in by the page component (server components don't have
   * implicit access to the current URL on Next 16 — see usage example).
   */
  next?: string;
}

/**
 * Server-side auth guard for RSC pages and route handlers.
 *
 * Usage in a page (the page passes its own path so the guard can build a clean
 * `?next=` — Next 16 doesn't expose the current URL inside RSC any other way):
 *
 *   export default async function PanelPage() {
 *     const user = await requireAuth({ role: "customer", next: "/panel" });
 *     return <Dashboard user={user} />;
 *   }
 *
 * Why redirect inside `getSession()` would be wrong:
 *   `getSession()` is called by `/api/auth/me` and other contexts where a
 *   "not signed in" outcome is *information*, not a navigation. Keeping the
 *   redirect in a separate guard lets the same primitive serve both.
 *
 * Role mismatch UX:
 *   A teacher hitting `/panel` (customer-only) bounces to `/panel-ogretmen`,
 *   not to `/giris` — they're already authenticated, just on the wrong page.
 *   Customers hitting `/panel-ogretmen` bounce to `/panel`.
 */
export async function requireAuth(
  options: RequireAuthOptions = {},
): Promise<SafeUser> {
  const session = await getSession();
  const loginPath = options.loginPath ?? "/giris";

  if (!session) {
    const target = options.next
      ? `${loginPath}?next=${encodeURIComponent(options.next)}`
      : loginPath;
    redirect(target);
  }

  if (options.role) {
    const allowed = Array.isArray(options.role) ? options.role : [options.role];
    const role = session.user.role;
    // Treat null role (user hasn't picked one yet — possible for OAuth-bootstrap
    // or pre-role-select states) as a mismatch and bounce home.
    if (role === null || !allowed.includes(role)) {
      redirect(roleHomepage(role));
    }
  }

  return session.user;
}

/**
 * Where each role's home dashboard lives. Surfaces in role-mismatch redirects
 * and in any "go to dashboard" link inside server components.
 */
export function roleHomepage(role: UserRole | null): string {
  switch (role) {
    case "teacher":
      return "/panel-ogretmen";
    case "admin":
      return "/panel"; // admin landing not yet split; falls back to customer panel
    case "customer":
      return "/panel";
    default:
      // null / unknown — send to landing rather than loop on a panel they
      // can't access. /rol-sec will handle role pick once that lands.
      return "/";
  }
}
