export type SupportedLocale = "tr" | "en";

export interface LocalizedText {
  tr: string;
  en: string;
}

export function pickLocalized<T extends Partial<LocalizedText>>(
  value: T,
  locale: SupportedLocale,
  fallback: SupportedLocale = "tr"
): string {
  return (value?.[locale] ?? value?.[fallback] ?? "") as string;
}
