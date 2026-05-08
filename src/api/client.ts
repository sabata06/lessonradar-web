import "server-only";

import { getLocale } from "next-intl/server";

const BASE = process.env.DJANGO_API_BASE;

// `LR_USE_MOCK=1` lets local builds + CI render the marketplace pages
// from `src/lib/data/mock/*` without a Django backend reachable. Auth
// flows still need the real API, but they're never invoked on the SSG
// paths that opt into the mock fallback.
const MOCK_MODE = process.env.LR_USE_MOCK === "1";

if (!BASE && !MOCK_MODE) {
  // Fail fast at module load only when running on the server.
  // Client bundles can't reach this file thanks to "server-only".
  throw new Error(
    "DJANGO_API_BASE is not set. Add it to .env.local (see .env.example), or set LR_USE_MOCK=1 to render from mock data.",
  );
}

// Provide a placeholder base URL when mock mode is on so `new URL(...)`
// in `buildUrl` doesn't crash; calls go through the mock fallback layer
// before they ever hit the network.
const TRUSTED_BASE = BASE ?? "http://mock.invalid";

export type ApiQuery = Record<
  string,
  string | number | boolean | null | undefined
>;

export interface ApiOptions {
  /** Django access token (short-lived JWT). Server callers attach it explicitly. */
  accessToken?: string;
  body?: unknown;
  /** Defaults to `no-store`. pSEO fetchers should pass `cache: "force-cache"` + `next.revalidate`. */
  cache?: RequestCache;
  next?: { revalidate?: number | false; tags?: string[] };
  query?: ApiQuery;
  signal?: AbortSignal;
  /** Override `Accept-Language`. Defaults to current next-intl locale. */
  locale?: string;
  /** Extra headers to merge in. */
  headers?: Record<string, string>;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly detail: unknown;

  constructor(status: number, code: string, detail: unknown) {
    super(`API ${status} (${code})`);
    this.status = status;
    this.code = code;
    this.detail = detail;
  }

  /** Normalize DRF field-error payload to a flat `{field: code}` map. */
  fieldErrors(): Record<string, string> | null {
    if (!this.detail || typeof this.detail !== "object") return null;
    const out: Record<string, string> = {};
    for (const [field, value] of Object.entries(this.detail)) {
      if (Array.isArray(value) && value.length > 0) {
        const first = value[0];
        if (typeof first === "string") out[field] = first;
        else if (first && typeof first === "object" && "code" in first) {
          out[field] = String((first as { code: unknown }).code);
        }
      } else if (typeof value === "string") {
        out[field] = value;
      }
    }
    return Object.keys(out).length > 0 ? out : null;
  }
}

async function resolveLocale(override?: string): Promise<string> {
  if (override) return override;
  try {
    return await getLocale();
  } catch {
    return "tr";
  }
}

function buildUrl(path: string, query?: ApiQuery): string {
  const url = new URL(path.replace(/^\/+/, "/"), TRUSTED_BASE);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null) continue;
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

async function buildHeaders(
  opts: ApiOptions,
  hasBody: boolean,
): Promise<Headers> {
  const headers = new Headers({
    Accept: "application/json",
    "Accept-Language": await resolveLocale(opts.locale),
  });
  if (hasBody) headers.set("Content-Type", "application/json");
  if (opts.accessToken) {
    headers.set("Authorization", `Bearer ${opts.accessToken}`);
  }
  if (opts.headers) {
    for (const [key, value] of Object.entries(opts.headers)) {
      headers.set(key, value);
    }
  }
  return headers;
}

async function request<T>(
  method: string,
  path: string,
  opts: ApiOptions = {},
): Promise<T> {
  const hasBody = opts.body !== undefined && opts.body !== null;
  const init: RequestInit & { next?: ApiOptions["next"] } = {
    method,
    headers: await buildHeaders(opts, hasBody),
    cache: opts.cache ?? "no-store",
    signal: opts.signal,
  };
  if (hasBody) init.body = JSON.stringify(opts.body);
  if (opts.next) init.next = opts.next;

  const res = await fetch(buildUrl(path, opts.query), init);

  if (res.status === 204 || res.status === 205) {
    return undefined as T;
  }

  const contentType = res.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");
  const payload: unknown = isJson
    ? await res.json().catch(() => null)
    : await res.text().catch(() => null);

  if (!res.ok) {
    const code =
      (isJson &&
        payload &&
        typeof payload === "object" &&
        "code" in payload &&
        typeof (payload as { code?: unknown }).code === "string"
        ? (payload as { code: string }).code
        : null) ?? `http_${res.status}`;
    throw new ApiError(res.status, code, payload);
  }

  return payload as T;
}

export const apiClient = {
  get: <T>(path: string, opts?: ApiOptions) => request<T>("GET", path, opts),
  post: <T>(path: string, body?: unknown, opts?: ApiOptions) =>
    request<T>("POST", path, { ...opts, body }),
  patch: <T>(path: string, body?: unknown, opts?: ApiOptions) =>
    request<T>("PATCH", path, { ...opts, body }),
  put: <T>(path: string, body?: unknown, opts?: ApiOptions) =>
    request<T>("PUT", path, { ...opts, body }),
  delete: <T>(path: string, opts?: ApiOptions) =>
    request<T>("DELETE", path, opts),
};

export type ApiClient = typeof apiClient;
