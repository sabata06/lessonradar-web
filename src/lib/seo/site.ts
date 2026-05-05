import { routing } from "@/i18n/routing";

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "https://lessonradar.com";

export const SITE_NAME = "LessonRadar";

export function buildLocaleUrl(locale: string, path: string = "/"): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  if (cleanPath === "/") return `${SITE_URL}/${locale}`;
  return `${SITE_URL}/${locale}${cleanPath}`;
}

export function buildHreflangAlternates(path: string = "/") {
  const languages: Record<string, string> = {};
  for (const locale of routing.locales) {
    languages[locale] = buildLocaleUrl(locale, path);
  }
  // x-default points to the default locale
  languages["x-default"] = buildLocaleUrl(routing.defaultLocale, path);
  return languages;
}
