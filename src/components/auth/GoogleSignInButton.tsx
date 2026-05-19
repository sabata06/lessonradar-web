"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Script from "next/script";
import { useTranslations } from "next-intl";

import { useRouter } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth/client";
import type { SafeUser } from "@/lib/auth/server";

/**
 * Google Sign-In (Google Identity Services / "GIS") button.
 *
 * Flow:
 *   1. Mount-time we generate a per-attempt `nonce` (32 random bytes
 *      base64url-encoded). This is the replay-attack guard.
 *   2. The GIS script (`accounts.google.com/gsi/client`) renders the
 *      Google-branded button into our container `<div>`. We pass the nonce
 *      via `google.accounts.id.initialize`.
 *   3. User signs in → Google returns an ID token whose `nonce` claim
 *      mirrors our generated value.
 *   4. We POST `{ id_token, nonce }` to `/api/auth/google`. The BFF
 *      forwards to Django; backend verifies signature + audience + nonce
 *      and mints a session.
 *   5. On success we hydrate AuthProvider and push the user to `next` (or
 *      the role homepage).
 *
 * Why nonce instead of PKCE: PKCE is the redirect-flow primitive. GIS web
 * uses the implicit ID-token flow (popup, no redirect) where the canonical
 * replay guard is `nonce`. Same security goal — different transport.
 */

interface Props {
  context: "signin" | "signup";
  next: string;
  /** Disable button while the parent form is busy (e.g. submitting email/pw). */
  disabled?: boolean;
}

interface GoogleCredentialResponse {
  credential: string;
}

interface GoogleAccountsIdNamespace {
  initialize: (config: GoogleInitConfig) => void;
  renderButton: (parent: HTMLElement, options: GoogleButtonOptions) => void;
  disableAutoSelect?: () => void;
  cancel?: () => void;
}

interface GoogleInitConfig {
  client_id: string;
  callback: (response: GoogleCredentialResponse) => void;
  nonce: string;
  auto_select?: boolean;
  cancel_on_tap_outside?: boolean;
  use_fedcm_for_prompt?: boolean;
  context?: "signin" | "signup" | "use";
  ux_mode?: "popup" | "redirect";
}

interface GoogleButtonOptions {
  type?: "standard" | "icon";
  theme?: "outline" | "filled_blue" | "filled_black";
  size?: "large" | "medium" | "small";
  text?: "signin_with" | "signup_with" | "continue_with" | "signin";
  shape?: "rectangular" | "pill" | "circle" | "square";
  logo_alignment?: "left" | "center";
  width?: number | string;
  locale?: string;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: GoogleAccountsIdNamespace;
      };
    };
  }
}

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";

function generateNonce(): string {
  // 32 bytes → 256 bits of entropy. Base64url so it's transmittable inside
  // a JWT claim without escaping.
  const buffer = new Uint8Array(32);
  crypto.getRandomValues(buffer);
  let binary = "";
  for (const byte of buffer) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function roleHomepath(role: SafeUser["role"]): string {
  switch (role) {
    case "teacher":
      return "/panel-ogretmen";
    case "admin":
      return "/panel";
    default:
      return "/panel";
  }
}

export function GoogleSignInButton({ context, next, disabled }: Props) {
  const t = useTranslations("auth.google");
  const containerId = useId();
  const router = useRouter();
  const { setUser } = useAuth();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const nonceRef = useRef<string>("");
  const renderedRef = useRef(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Stable nonce for the lifetime of the component mount. Regenerating on
  // every render would race against the GIS internal state and produce
  // "nonce mismatch" failures.
  if (!nonceRef.current) {
    nonceRef.current = generateNonce();
  }

  const handleCredential = useCallback(
    async (response: GoogleCredentialResponse) => {
      setSubmitting(true);
      setErrorMessage(null);
      try {
        const res = await fetch("/api/auth/google", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({
            id_token: response.credential,
            nonce: nonceRef.current,
          }),
        });
        const data = (await res.json().catch(() => null)) as
          | { user?: SafeUser; isNewUser?: boolean; error?: string }
          | null;
        if (!res.ok || !data?.user) {
          setErrorMessage(
            errorMessageFor(data?.error ?? "unknown_error", t),
          );
          // Rotate the nonce so a retry isn't rejected as a replay.
          nonceRef.current = generateNonce();
          return;
        }
        setUser(data.user);
        const destination =
          isSafeNext(next) ? next : roleHomepath(data.user.role);
        router.replace(destination);
        router.refresh();
      } catch {
        setErrorMessage(t("errors.network_error"));
        nonceRef.current = generateNonce();
      } finally {
        setSubmitting(false);
      }
    },
    [next, router, setUser, t],
  );

  useEffect(() => {
    if (!scriptLoaded) return;
    if (renderedRef.current) return;
    if (!CLIENT_ID) return;
    const container = containerRef.current;
    const gis = window.google?.accounts?.id;
    if (!container || !gis) return;

    gis.initialize({
      client_id: CLIENT_ID,
      callback: (response) => {
        void handleCredential(response);
      },
      nonce: nonceRef.current,
      auto_select: false,
      cancel_on_tap_outside: true,
      use_fedcm_for_prompt: true,
      context,
      ux_mode: "popup",
    });
    gis.renderButton(container, {
      type: "standard",
      theme: "outline",
      size: "large",
      text: context === "signup" ? "signup_with" : "continue_with",
      shape: "rectangular",
      logo_alignment: "left",
      width: 320,
    });
    renderedRef.current = true;
  }, [scriptLoaded, context, handleCredential]);

  // Configuration sanity: missing env should render an inert hint in dev so
  // we notice before pushing a button that can't actually authenticate.
  if (!CLIENT_ID) {
    return (
      <div
        role="note"
        className="rounded-xl border border-dashed border-border bg-muted/40 p-3 text-xs text-muted-foreground"
      >
        {t("config_missing")}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => setScriptLoaded(true)}
        onReady={() => setScriptLoaded(true)}
      />
      <div className="flex flex-col items-stretch gap-2">
        <div
          id={`google-signin-${containerId}`}
          ref={containerRef}
          aria-busy={submitting}
          aria-disabled={disabled}
          className={
            disabled || submitting
              ? "pointer-events-none opacity-60"
              : undefined
          }
        />
      </div>
      {errorMessage ? (
        <p
          role="alert"
          className="text-xs font-medium text-destructive"
        >
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}

const SAFE_NEXT_REGEX = /^\/[A-Za-z0-9/_\-?=&%.]*$/;

function isSafeNext(next: string): boolean {
  // Prevent open-redirect by only honoring same-origin paths.
  return SAFE_NEXT_REGEX.test(next);
}

function errorMessageFor(
  code: string,
  t: ReturnType<typeof useTranslations>,
): string {
  switch (code) {
    case "rate_limited":
      return t("errors.rate_limited");
    case "missing_id_token":
    case "missing_nonce":
    case "google_auth_failed":
      return t("errors.auth_failed");
    case "account_inactive":
      return t("errors.account_inactive");
    case "account_deleted":
    case "account_deletion_in_progress":
      return t("errors.account_deleted");
    case "upstream_error":
    case "invalid_origin":
    case "invalid_body":
      return t("errors.upstream_error");
    default:
      return t("errors.unknown");
  }
}
