import "server-only";

import { EncryptJWT, jwtDecrypt } from "jose";

import { apiClient, ApiError } from "@/api/client";
import { ENDPOINTS } from "@/api/endpoints";

/**
 * Encrypted session envelope (D11=B encrypted cookie).
 *
 * The Django access/refresh JWTs never leave the server; they live inside an
 * AES-256-GCM-encrypted cookie that only this process can decrypt. The browser
 * sees an opaque blob.
 *
 * Encryption: dir + A256GCM via `jose`. Key is derived from `SESSION_SECRET`
 * env var (must be 32 bytes — generate with
 * `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
 * and decode here).
 */

export type UserRole = "customer" | "teacher" | "admin";

/** Public user fields safe to return to the browser via `/api/auth/me`. */
export interface SafeUser {
  id: string;
  email: string;
  role: UserRole | null;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  profileImageUrl: string | null;
  isEmailVerified: boolean;
  accountStatus: string;
  onboardingStatus: string;
  authProvider: string;
  locale: string;
  hasUsablePassword: boolean;
}

export interface SessionPayload {
  user: SafeUser;
  /** Short-lived Django access JWT (10 min). Server-only — never returned to client. */
  djangoAccess: string;
  /** Long-lived Django refresh JWT (30 days). Server-only. */
  djangoRefresh: string;
  /** Unix seconds — when `djangoAccess` expires. */
  accessExp: number;
}

/** Build a SafeUser from the Django ProfileSerializer payload. */
export function safeUserFromProfile(profile: Record<string, unknown>): SafeUser {
  const role = profile.role;
  return {
    id: String(profile.id ?? ""),
    email: String(profile.email ?? ""),
    role:
      role === "customer" || role === "teacher" || role === "admin"
        ? role
        : null,
    firstName: String(profile.first_name ?? ""),
    lastName: String(profile.last_name ?? ""),
    avatarUrl:
      typeof profile.avatar_url === "string" ? profile.avatar_url : null,
    profileImageUrl:
      typeof profile.profile_image_url === "string"
        ? profile.profile_image_url
        : null,
    isEmailVerified: Boolean(profile.is_email_verified),
    accountStatus: String(profile.account_status ?? ""),
    onboardingStatus: String(profile.onboarding_status ?? ""),
    authProvider: String(profile.auth_provider ?? "email"),
    locale: String(profile.locale ?? "tr"),
    hasUsablePassword: Boolean(profile.has_usable_password),
  };
}

const SESSION_SECRET_RAW = process.env.SESSION_SECRET;
if (!SESSION_SECRET_RAW) {
  throw new Error(
    "SESSION_SECRET is not set. Generate 32 bytes (base64) and add to .env.local.",
  );
}

const SESSION_KEY = decodeSecret(SESSION_SECRET_RAW);

/** Cookie attribute constants. Imported by `cookies.ts`. */
export const SESSION_COOKIE_NAME = "lr_session";
export const SESSION_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

/** Refresh access if it expires within this many seconds. */
const ACCESS_REFRESH_LEEWAY_SEC = 30;

function decodeSecret(raw: string): Uint8Array {
  // Allow either base64 (preferred) or raw 32-byte UTF-8 string.
  if (/^[A-Za-z0-9+/=_-]+$/.test(raw) && raw.length >= 43) {
    try {
      const normalized = raw.replace(/-/g, "+").replace(/_/g, "/");
      const buf = Buffer.from(normalized, "base64");
      if (buf.length === 32) return new Uint8Array(buf);
    } catch {
      // fall through to utf-8 path
    }
  }
  const bytes = new TextEncoder().encode(raw);
  if (bytes.length !== 32) {
    throw new Error(
      `SESSION_SECRET must decode to exactly 32 bytes (got ${bytes.length}). Use a base64-encoded 32-byte value.`,
    );
  }
  return bytes;
}

export async function encryptSession(payload: SessionPayload): Promise<string> {
  return await new EncryptJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .encrypt(SESSION_KEY);
}

export async function decryptSession(
  token: string,
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtDecrypt(token, SESSION_KEY);
    if (!isSessionPayload(payload)) return null;
    return payload;
  } catch {
    return null;
  }
}

function isSessionPayload(value: unknown): value is SessionPayload {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (
    typeof v.djangoAccess !== "string" ||
    typeof v.djangoRefresh !== "string" ||
    typeof v.accessExp !== "number"
  ) {
    return false;
  }
  const user = v.user;
  if (!user || typeof user !== "object") return false;
  const u = user as Record<string, unknown>;
  return typeof u.id === "string" && typeof u.email === "string";
}

interface DjangoTokenRefreshResponse {
  access: string;
  /** Present when `ROTATE_REFRESH_TOKENS=True`. */
  refresh?: string;
}

/**
 * Refresh the Django access token using the stored refresh token.
 * Returns a new SessionPayload that the caller must re-cookie via `setSessionCookie`.
 */
export async function refreshAccessToken(
  session: SessionPayload,
): Promise<SessionPayload | null> {
  try {
    const data = await apiClient.post<DjangoTokenRefreshResponse>(
      ENDPOINTS.AUTH_TOKEN_REFRESH,
      { refresh: session.djangoRefresh },
    );
    return {
      ...session,
      djangoAccess: data.access,
      djangoRefresh: data.refresh ?? session.djangoRefresh,
      accessExp: Math.floor(Date.now() / 1000) + 10 * 60, // 10 minutes (matches SimpleJWT setting)
    };
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      // refresh expired or blacklisted
      return null;
    }
    // network / 5xx — surface as null so caller can clear the cookie
    return null;
  }
}

export function isAccessExpired(session: SessionPayload): boolean {
  const now = Math.floor(Date.now() / 1000);
  return session.accessExp - ACCESS_REFRESH_LEEWAY_SEC <= now;
}
