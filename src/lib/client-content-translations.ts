import ru from "@/lib/translations/client-ru.json";
import zh from "@/lib/translations/client-zh.json";
import { deepTranslate, type Dictionary } from "@/lib/content-i18n";

const CATALOGS: Record<string, Dictionary> = { ru, zh };

// For client components that render data bundled with the app (transport
// subsidies, visa services, sample exhibitor profiles).
export function translateClientContent<T>(value: T, locale: string): T {
  const dict = CATALOGS[locale];
  return dict ? deepTranslate(dict, value) : value;
}
