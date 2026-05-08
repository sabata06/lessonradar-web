import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  reactCompiler: true,
  // NOTE: Next 16's `cacheComponents: true` (= PPR) would let us stream
  // cookie-bound auth state inside an otherwise SSG layout. Tried 2026-05-08
  // and it conflicts with `export const runtime/dynamic` on route handlers —
  // requires a full caching-model migration (every page needs `"use cache"`
  // and a curated cache strategy). Out of B2 scope; revisit as its own phase
  // before launch. For now we keep auth client-hydrated to preserve SSG.
  output: "standalone",
  // Pin Turbopack to this app's directory so the root-level package-lock.json
  // (from the Expo/RN workspace) does not hijack the workspace root.
  turbopack: {
    root: import.meta.dirname,
  },
  images: {
    remotePatterns: [
      // Backend-served avatars (uploaded teacher / customer photos).
      { protocol: "https", hostname: "api.lessonradar.com" },
      // Google OAuth avatars — assigned to `profile_image_url` /
      // `avatar_url` for users who registered via Google Sign-In and
      // haven't uploaded their own photo. Google rotates the lh1–lh6
      // subdomains; keep all of them on the allowlist so an avatar
      // doesn't silently disappear when the CDN reshuffles.
      { protocol: "https", hostname: "lh1.googleusercontent.com" },
      { protocol: "https", hostname: "lh2.googleusercontent.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "lh4.googleusercontent.com" },
      { protocol: "https", hostname: "lh5.googleusercontent.com" },
      { protocol: "https", hostname: "lh6.googleusercontent.com" },
      // Stock imagery used by editorial banners (homepage hero, etc.).
      { protocol: "https", hostname: "images.unsplash.com" },
      // Mock-only avatar source. Prod data never references it; whitelist
      // is kept so `LR_USE_MOCK=1` builds don't trip the optimizer.
      { protocol: "https", hostname: "i.pravatar.cc" },
    ],
  },
};

export default withNextIntl(nextConfig);
