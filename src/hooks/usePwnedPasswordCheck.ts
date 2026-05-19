"use client";

import { useEffect, useState } from "react";

import { checkPwnedPassword } from "@/lib/security/pwned-password";

interface PwnedResult {
  /** Number of breaches the password has appeared in. `0` = clean, `null` =
   * unchecked / network failure / too short. UI should treat `null` as
   * "don't render anything" — never as "safe". */
  count: number | null;
  loading: boolean;
}

/**
 * Debounced pwned-password check. Hooks into a controlled password field
 * (e.g. react-hook-form's `watch("password")`) and surfaces the breach
 * count once the user stops typing for `debounceMs`.
 *
 * Aborts in-flight checks on every keystroke so a slow network never
 * surfaces a stale result for a different password.
 */
export function usePwnedPasswordCheck(
  password: string,
  debounceMs = 500,
): PwnedResult {
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!password || password.length < 8) {
      setCount(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const result = await checkPwnedPassword(password, controller.signal);
        if (!controller.signal.aborted) setCount(result);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, debounceMs);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
      setLoading(false);
    };
  }, [password, debounceMs]);

  return { count, loading };
}
