"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type {
  ApplicationApiPayload,
  ApplicationFieldErrorEnvelope,
  ApplicationPatchPayload,
  ApplicationViewModel,
} from "@/lib/teacher-application/types";
import { toViewModel } from "@/lib/teacher-application/types";

type SaveState =
  | { kind: "idle"; lastSavedAt: string | null }
  | { kind: "saving" }
  | { kind: "saved"; savedAt: number }
  | { kind: "error"; message: string };

interface UseDraftResult {
  initialView: ApplicationViewModel;
  saveState: SaveState;
  /** Patch one or more fields. Debounced; merges queued patches. */
  patch: (changes: ApplicationPatchPayload) => void;
  /** Force an immediate flush of pending patches (used before navigation). */
  flush: () => Promise<void>;
  /** Submit the application. Returns the final api payload. */
  submit: (
    versionStamps: {
      kvkkVersion: string;
      termsVersion: string;
      teacherAgreementVersion: string;
    },
  ) => Promise<
    | { ok: true; payload: ApplicationApiPayload }
    | { ok: false; error: ApplicationFieldErrorEnvelope }
  >;
}

const AUTOSAVE_DEBOUNCE_MS = 1500;

function readCsrfCookie(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(/(?:^|;\s*)lr_csrf=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

export function useTeacherApplicationDraft(
  initial: ApplicationApiPayload,
): UseDraftResult {
  const initialView = toViewModel(initial);

  const uuidRef = useRef(initial.uuid);
  const queueRef = useRef<ApplicationPatchPayload>({});
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inflightRef = useRef<Promise<void> | null>(null);

  const [saveState, setSaveState] = useState<SaveState>({
    kind: "idle",
    lastSavedAt: initial.last_saved_at,
  });

  const flushImmediate = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const queued = queueRef.current;
    if (Object.keys(queued).length === 0) return;
    queueRef.current = {};

    setSaveState({ kind: "saving" });
    try {
      const res = await fetch(
        `/api/teacher-application/${uuidRef.current}`,
        {
          method: "PATCH",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
            "x-csrf-token": readCsrfCookie(),
          },
          body: JSON.stringify(queued),
        },
      );
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as
          ApplicationFieldErrorEnvelope;
        const message =
          payload.error === "csrf_failed"
            ? "Oturum süresi doldu. Sayfayı yenile."
            : payload.error === "unauthorized"
              ? "Oturum gerekli."
              : "Kaydetme başarısız. Bağlantını kontrol et.";
        setSaveState({ kind: "error", message });
        // Re-queue so the next user action retries automatically.
        queueRef.current = { ...queued, ...queueRef.current };
        return;
      }
      setSaveState({ kind: "saved", savedAt: Date.now() });
    } catch {
      setSaveState({
        kind: "error",
        message: "Bağlantı hatası. Tekrar denenecek.",
      });
      queueRef.current = { ...queued, ...queueRef.current };
    }
  }, []);

  const flush = useCallback(async () => {
    // Coalesce concurrent flushes so we don't race PATCHes.
    if (inflightRef.current) {
      await inflightRef.current;
      return;
    }
    const promise = flushImmediate();
    inflightRef.current = promise;
    try {
      await promise;
    } finally {
      inflightRef.current = null;
    }
  }, [flushImmediate]);

  const patch = useCallback(
    (changes: ApplicationPatchPayload) => {
      queueRef.current = { ...queueRef.current, ...changes };
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        void flush();
      }, AUTOSAVE_DEBOUNCE_MS);
    },
    [flush],
  );

  // Persist any pending changes on unmount or tab close.
  useEffect(() => {
    const onPageHide = () => {
      if (Object.keys(queueRef.current).length === 0) return;
      const blob = new Blob(
        [JSON.stringify(queueRef.current)],
        { type: "application/json" },
      );
      // `sendBeacon` doesn't carry custom headers, so the CSRF guard would
      // reject it. Fall back to a synchronous fetch via keepalive instead.
      void fetch(`/api/teacher-application/${uuidRef.current}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": readCsrfCookie(),
        },
        body: blob,
        keepalive: true,
      });
    };
    window.addEventListener("pagehide", onPageHide);
    return () => {
      window.removeEventListener("pagehide", onPageHide);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const submit = useCallback<UseDraftResult["submit"]>(
    async (versionStamps) => {
      // Ensure any pending edits land before the final transition.
      await flush();

      const res = await fetch(
        `/api/teacher-application/${uuidRef.current}/submit`,
        {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
            "x-csrf-token": readCsrfCookie(),
          },
          body: JSON.stringify({
            kvkk_version: versionStamps.kvkkVersion,
            terms_version: versionStamps.termsVersion,
            teacher_agreement_version: versionStamps.teacherAgreementVersion,
          }),
        },
      );
      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        return {
          ok: false,
          error: (payload ?? { error: "submit_failed" }) as
            ApplicationFieldErrorEnvelope,
        };
      }
      return { ok: true, payload: payload as ApplicationApiPayload };
    },
    [flush],
  );

  return { initialView, saveState, patch, flush, submit };
}
