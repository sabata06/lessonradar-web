"use client";

import Script from "next/script";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

/**
 * Cloudflare Turnstile widget (B2.S7).
 *
 * Renders the managed-mode challenge inside a div, lazy-loads the API script,
 * and surfaces the resulting token via `onVerify`. Tokens are one-time-use; on
 * an auth error the parent should call `reset()` via the imperative ref to
 * regenerate.
 *
 * Site key comes from `NEXT_PUBLIC_TURNSTILE_SITE_KEY`. When the env var is
 * unset the widget renders nothing (and the parent must treat the form as
 * dev-mode, where the BFF bypasses verification).
 */

type TurnstileApi = {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      theme?: "light" | "dark" | "auto";
      callback?: (token: string) => void;
      "error-callback"?: () => void;
      "expired-callback"?: () => void;
      "timeout-callback"?: () => void;
      action?: string;
    },
  ) => string;
  reset: (widgetId?: string) => void;
  remove: (widgetId?: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

export interface TurnstileWidgetHandle {
  reset: () => void;
}

interface TurnstileWidgetProps {
  onVerify: (token: string) => void;
  onError?: () => void;
  onExpire?: () => void;
  className?: string;
  /** Action label sent to Cloudflare for analytics — e.g. "login", "register". */
  action?: string;
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js";

export const TurnstileWidget = forwardRef<
  TurnstileWidgetHandle,
  TurnstileWidgetProps
>(function TurnstileWidget(
  { onVerify, onError, onExpire, className, action },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [scriptLoaded, setScriptLoaded] = useState(
    () => typeof window !== "undefined" && Boolean(window.turnstile),
  );

  // Latest-callback refs so widget render isn't tied to function identity.
  const onVerifyRef = useRef(onVerify);
  const onErrorRef = useRef(onError);
  const onExpireRef = useRef(onExpire);
  onVerifyRef.current = onVerify;
  onErrorRef.current = onError;
  onExpireRef.current = onExpire;

  useImperativeHandle(
    ref,
    () => ({
      reset: () => {
        if (widgetIdRef.current && window.turnstile) {
          window.turnstile.reset(widgetIdRef.current);
        }
      },
    }),
    [],
  );

  useEffect(() => {
    if (!scriptLoaded || !SITE_KEY) return;
    if (!containerRef.current) return;
    if (widgetIdRef.current) return; // already rendered

    const api = window.turnstile;
    if (!api) return;

    const id = api.render(containerRef.current, {
      sitekey: SITE_KEY,
      theme: "light",
      action,
      callback: (token: string) => onVerifyRef.current(token),
      "error-callback": () => onErrorRef.current?.(),
      "expired-callback": () => onExpireRef.current?.(),
    });
    widgetIdRef.current = id;

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [scriptLoaded, action]);

  if (!SITE_KEY) {
    // Dev mode without a key — BFF will bypass verification. Render nothing
    // so the visual layout matches non-dev state on first paint.
    return null;
  }

  return (
    <>
      <Script
        src={SCRIPT_SRC}
        strategy="afterInteractive"
        onLoad={() => setScriptLoaded(true)}
      />
      <div ref={containerRef} className={className} />
    </>
  );
});

/** Convenience: report whether a Turnstile site key is configured client-side. */
export function isTurnstileEnabled(): boolean {
  return Boolean(SITE_KEY);
}
