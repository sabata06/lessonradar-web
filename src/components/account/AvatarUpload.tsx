"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Camera01Icon,
  CheckmarkCircle02Icon,
  UserIcon,
} from "@hugeicons/core-free-icons";

import { uploadAvatarRequest } from "@/lib/account/client";
import type { AvatarUploadErrorCode } from "@/lib/account/types";
import { compressImage } from "@/lib/image/compress";
import { cn } from "@/lib/utils";

interface Props {
  /** Stored R2/CDN URL on the customer profile. Used as preview source until
   *  a successful upload swaps it. */
  initialImageUrl: string | null;
  /** Fallback display when no image is set — typically the user's first name. */
  fallbackName: string;
}

const ACCEPT_MIME =
  "image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif";

export function AvatarUpload({ initialImageUrl, fallbackName }: Props) {
  const t = useTranslations("panel.settings.profile.avatar");
  const tErrors = useTranslations("account.errors");
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [serverUrl, setServerUrl] = useState<string | null>(initialImageUrl);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<AvatarUploadErrorCode | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isUploading, setIsUploading] = useState(false);

  // Revoke the in-memory blob URL when it changes or unmounts so we don't
  // leak object URLs across consecutive uploads.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // Auto-clear success indicator after 3s — avoids a permanent green dot.
  useEffect(() => {
    if (!success) return;
    const timeoutId = window.setTimeout(() => setSuccess(false), 3000);
    return () => window.clearTimeout(timeoutId);
  }, [success]);

  const initials = (fallbackName || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  async function handleFile(file: File) {
    setError(null);
    setSuccess(false);

    if (file.size === 0) {
      setError("file_required");
      return;
    }

    // Optimistic preview — fires before the network round-trip so the user
    // sees their selected face immediately.
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    setIsUploading(true);
    try {
      const compressed = await compressImage(file).catch(() => file);
      const result = await uploadAvatarRequest(compressed);
      if (!result.ok) {
        setError(result.code);
        setPreviewUrl(null);
        return;
      }
      setServerUrl(result.data.profile_image_url);
      setPreviewUrl(null);
      setSuccess(true);
      // Refresh the surrounding page so the header avatar + completion bar
      // pick up the new image without a full reload.
      startTransition(() => router.refresh());
    } catch {
      setError("upload_failed");
      setPreviewUrl(null);
    } finally {
      setIsUploading(false);
    }
  }

  function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    void handleFile(file);
    // Reset the input so the same file can be re-selected after an error.
    event.target.value = "";
  }

  const currentPreview = previewUrl ?? serverUrl;
  const busy = isUploading || isPending;

  return (
    <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
      <div className="relative">
        <div
          className={cn(
            "flex size-24 items-center justify-center overflow-hidden rounded-full border border-border bg-muted",
            busy && "opacity-60",
          )}
        >
          {currentPreview ? (
            <Image
              src={currentPreview}
              alt=""
              width={96}
              height={96}
              className="size-full object-cover"
              unoptimized={currentPreview.startsWith("blob:")}
            />
          ) : initials ? (
            <span className="text-2xl font-semibold text-primary">
              {initials}
            </span>
          ) : (
            <HugeiconsIcon
              icon={UserIcon}
              size={36}
              strokeWidth={1.5}
              className="text-muted-foreground"
            />
          )}
        </div>
        {success ? (
          <span
            role="status"
            aria-live="polite"
            className="absolute -right-1 -top-1 flex size-7 items-center justify-center rounded-full bg-success text-white shadow-card"
          >
            <HugeiconsIcon
              icon={CheckmarkCircle02Icon}
              size={16}
              strokeWidth={2.5}
            />
          </span>
        ) : null}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-primary/30 bg-card px-4 text-sm font-semibold text-primary transition-colors hover:bg-primary/5 disabled:opacity-50"
          >
            <HugeiconsIcon icon={Camera01Icon} size={16} strokeWidth={2} />
            {busy
              ? t("uploading")
              : serverUrl
                ? t("change")
                : t("upload")}
          </button>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {t("hint")}
        </p>
        {error ? (
          <p
            role="alert"
            className="text-xs font-medium text-destructive"
          >
            {tErrors(error)}
          </p>
        ) : null}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_MIME}
        onChange={onFileChange}
        className="sr-only"
        aria-hidden="true"
      />
    </div>
  );
}
