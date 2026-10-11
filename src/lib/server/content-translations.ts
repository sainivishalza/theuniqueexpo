import ru from "@/lib/translations/catalog-ru.json";
import zh from "@/lib/translations/catalog-zh.json";
import { deepTranslate, translateText, type Dictionary } from "@/lib/content-i18n";

const CATALOGS: Record<string, Dictionary> = { ru, zh };

// Server-side only: the full catalog is large, so client components get just
// the slice they need (see client-content-translations.ts).
export function translateContent<T>(value: T, locale?: string): T {
  const dict = locale ? CATALOGS[locale] : undefined;
  return dict ? deepTranslate(dict, value) : value;
}

export function translateString(text: string, locale?: string): string {
  const dict = locale ? CATALOGS[locale] : undefined;
  return dict ? translateText(dict, text) : text;
}
