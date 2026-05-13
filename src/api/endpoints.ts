/**
 * Single source of truth for Django REST API paths.
 *
 * Paths are relative to `DJANGO_API_BASE` (server) or to `/api/proxy/...`
 * via Nginx (production same-origin). Always start with a leading slash.
 *
 * Group conventions:
 *   AUTH_*       — JWT and account management (already implemented in backend)
 *   ACCOUNT_*    — authenticated user profile / preferences
 *   MARKETPLACE_*— public marketplace endpoints (B3 — not yet implemented backend-side;
 *                   see WEB-BACKEND-INTEGRATION-PLAN.md §2.3.F)
 *   LEAD_*       — anonymous lead capture (B4 — backend wiring pending)
 *   TEACHER_APP_*— teacher application submission (B5 — backend wiring pending)
 */

export const ENDPOINTS = {
  // ── JWT (rest_framework_simplejwt) ──────────────────────────────────────
  AUTH_TOKEN_OBTAIN: "/api/token/",
  AUTH_TOKEN_REFRESH: "/api/token/refresh/",

  // ── Account / Auth (lessonradar app) ────────────────────────────────────
  AUTH_REGISTER: "/api/auth/register/",
  AUTH_BOOTSTRAP: "/api/auth/bootstrap/",
  AUTH_FORGOT_PASSWORD: "/api/auth/forgot-password/",
  AUTH_RESET_PASSWORD: "/api/auth/reset-password/",
  AUTH_CHANGE_PASSWORD: "/api/auth/change-password/",
  AUTH_VERIFY_EMAIL: "/api/auth/verify-email/",
  AUTH_RESEND_VERIFICATION: "/api/auth/resend-verification/",
  AUTH_GOOGLE: "/api/auth/google/",
  AUTH_PROFILE: "/api/auth/profile/",
  AUTH_CUSTOMER_PROFILE: "/api/auth/customer-profile/",
  AUTH_TEACHER_PROFILE: "/api/auth/teacher-profile/",
  AUTH_REGISTER_DEVICE: "/api/auth/register-device/",
  AUTH_LOGOUT: "/api/auth/logout/",

  // ── Marketplace public (LIVE as of B3.1.A–D, B3.4) ──────────────────────
  MARKETPLACE_TAXONOMY: "/api/marketplace/taxonomy/",
  /** Full active discipline catalog (added B3.4 — feeds /ara dropdown). */
  MARKETPLACE_TAXONOMY_DISCIPLINES: "/api/marketplace/taxonomy/disciplines/",
  MARKETPLACE_TEACHERS: "/api/marketplace/teachers/",
  /** Legacy id-based detail; the mobile app uses this. */
  MARKETPLACE_TEACHER_DETAIL_BY_ID: (id: number | string) =>
    `/api/marketplace/teachers/${encodeURIComponent(String(id))}/`,
  /** Slug-based detail used by the web's `/ogretmen/<slug>` SEO route. */
  MARKETPLACE_TEACHER_DETAIL_BY_SLUG: (slug: string) =>
    `/api/marketplace/teachers/by-slug/${encodeURIComponent(slug)}/`,
  MARKETPLACE_CITIES: "/api/marketplace/cities/",

  // ── Lead capture (B4 LIVE — authenticated verified-customer only) ───────
  LEAD_CREATE: "/api/marketplace/leads/",
  LEAD_CUSTOMER_MINE: "/api/customer/leads/mine/",
  // ── Customer lead detail + cancel (B6 LIVE 2026-05-14) ──────────────────
  LEAD_CUSTOMER_DETAIL: (uuid: string) =>
    `/api/customer/leads/${encodeURIComponent(uuid)}/`,
  LEAD_CUSTOMER_CANCEL: (uuid: string) =>
    `/api/customer/leads/${encodeURIComponent(uuid)}/cancel/`,
  LEAD_TEACHER_INBOX: "/api/teacher/leads/inbox/",
  LEAD_TEACHER_RESPOND: (recipientUuid: string) =>
    `/api/teacher/leads/${encodeURIComponent(recipientUuid)}/respond/`,
  LEAD_TEACHER_DECLINE: (recipientUuid: string) =>
    `/api/teacher/leads/${encodeURIComponent(recipientUuid)}/decline/`,

  // ── Teacher application (B5a LIVE) ──────────────────────────────────────
  TEACHER_APPLICATION_START: "/api/teacher-applications/",
  TEACHER_APPLICATION_CURRENT: "/api/teacher-applications/current/",
  TEACHER_APPLICATION_DETAIL: (uuid: string) =>
    `/api/teacher-applications/${encodeURIComponent(uuid)}/`,
  TEACHER_APPLICATION_SUBMIT: (uuid: string) =>
    `/api/teacher-applications/${encodeURIComponent(uuid)}/submit/`,
  TEACHER_APPLICATION_PHOTO: (uuid: string) =>
    `/api/teacher-applications/${encodeURIComponent(uuid)}/photo/`,
} as const;

export type EndpointKey = keyof typeof ENDPOINTS;
