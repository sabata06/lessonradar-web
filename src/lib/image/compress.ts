/**
 * Client-side image downscale + JPEG re-encode.
 *
 * Motivation: phone cameras emit 4–8 MB photos. Uploading the original
 * blows the 8 MB BFF cap on slow connections, burns Pillow CPU on the
 * server, and stalls the wizard photo step for 20+ seconds on 3G. A
 * canvas-based resize to a 1600px-longest-side JPEG at q=0.85 lands
 * around 200–500 KB while still producing a >1024² source for the
 * server pipeline's center-crop / WebP encode (which itself caps the
 * stored asset at 1024² — anything beyond the source is wasted bytes).
 *
 * Graceful failure: when the browser can't decode the input
 * (HEIC outside Safari, broken file, OOM on giant inputs) we return
 * the original `File` so the request still goes out and the server-
 * side Pillow + magic-byte validate produces a real error message.
 * Compression is an optimization, never a gate.
 */

interface CompressOptions {
  /** Longest-side cap in pixels. Default 1600 — leaves headroom over
   *  the server's 1024² center-crop while keeping payload small. */
  maxDimension?: number;
  /** JPEG quality, 0–1. Default 0.85 — visually near-lossless for
   *  portrait photos at this resolution; the server re-encodes to
   *  WebP at q=82 anyway, so over-shooting here is wasted bytes. */
  quality?: number;
  /** Output mime type. Default `image/jpeg` — broadest support,
   *  smallest weight at the chosen quality. */
  type?: string;
  /** Skip compression entirely when the input is already smaller
   *  than this (bytes). Re-encoding small files often *grows* them. */
  skipBelow?: number;
}

const DEFAULTS: Required<CompressOptions> = {
  maxDimension: 1600,
  quality: 0.85,
  type: "image/jpeg",
  skipBelow: 500_000, // 500 KB
};

export async function compressImage(
  file: File,
  options: CompressOptions = {},
): Promise<File> {
  // SSR safety: every browser API below is undefined on the server.
  if (typeof document === "undefined") return file;

  const opts = { ...DEFAULTS, ...options };
  if (!file.type.startsWith("image/")) return file;
  if (file.size <= opts.skipBelow) return file;

  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    // Unsupported format (HEIC on Chrome, corrupt header, OOM). The
    // server-side Pillow pipeline will reject or accept on its own
    // terms — we just hand the original blob across.
    return file;
  }

  try {
    const { width, height } = bitmap;
    const longest = Math.max(width, height);
    if (longest <= opts.maxDimension) {
      // Already small enough; round-tripping through canvas costs a
      // few KB without improving the asset.
      return file;
    }

    const scale = opts.maxDimension / longest;
    const targetW = Math.round(width * scale);
    const targetH = Math.round(height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    // `imageSmoothingQuality` defaults vary by browser; bumping to
    // "high" matters for the 4:1+ downscales typical of phone photos.
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, targetW, targetH);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, opts.type, opts.quality),
    );
    if (!blob) return file;

    // If the canvas round-trip actually grew the file (rare, but
    // possible on already-optimized JPEGs that get re-encoded), keep
    // the original to avoid pessimising bandwidth.
    if (blob.size >= file.size) return file;

    const originalName = file.name.replace(/\.[^.]+$/, "");
    const extension =
      opts.type === "image/jpeg" ? "jpg" : opts.type.split("/")[1] || "bin";
    return new File([blob], `${originalName}.${extension}`, {
      type: opts.type,
      lastModified: file.lastModified,
    });
  } finally {
    bitmap?.close?.();
  }
}
