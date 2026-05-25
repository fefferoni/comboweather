import { useEffect, useState } from "react";
import { I18n } from "i18n-js";
import * as Localization from "expo-localization";
import en from "./en.json";
import sv from "./sv.json";
import { type Language, useSettings } from "../store/settings";

export const SUPPORTED_LANGUAGES: Language[] = ["en", "sv"];

export const i18n = new I18n({ en, sv });
i18n.enableFallback = true;
i18n.defaultLocale = "en";

function pickInitialLocale(): Language {
  const tag = Localization.getLocales()[0]?.languageCode ?? "en";
  return (SUPPORTED_LANGUAGES as string[]).includes(tag)
    ? (tag as Language)
    : "en";
}

// Set a sane default before settings hydrate so the first render isn't blank.
i18n.locale = pickInitialLocale();

/**
 * Hook that syncs i18n's active locale with the persisted setting.
 * Components that call `t()` directly are fine — the locale is global — but
 * they need to be subscribed to re-render when language changes; this hook
 * delivers a `t` callback that updates on locale change.
 */
export function useT(): (key: string, options?: Record<string, unknown>) => string {
  const language = useSettings((s) => s.language);
  const hasHydrated = useSettings((s) => s.hasHydrated);
  const [, force] = useState(0);

  useEffect(() => {
    if (!hasHydrated) return;
    const desired: Language = language ?? pickInitialLocale();
    if (i18n.locale !== desired) {
      i18n.locale = desired;
      force((n) => n + 1);
    }
  }, [language, hasHydrated]);

  return (key, options) => i18n.t(key, options);
}

export function t(key: string, options?: Record<string, unknown>): string {
  return i18n.t(key, options);
}

/**
 * The currently-active app language, normalized to one of our supported
 * locales. Use this for date/time formatting where `settings.language`
 * might be `undefined` (= "follow device default") — falling straight
 * through `undefined` to `Intl` would otherwise default to `en-GB`
 * regardless of device locale, which is why the week view rendered
 * weekday names in English even when the rest of the UI was Swedish.
 */
export function activeLanguage(): Language {
  const tag = i18n.locale;
  if ((SUPPORTED_LANGUAGES as string[]).includes(tag)) return tag as Language;
  // i18n-js may have set a region-coded tag (e.g. "sv-SE") or a fallback;
  // strip to the language subtag and re-check.
  const base = tag.split(/[-_]/)[0];
  if (base && (SUPPORTED_LANGUAGES as string[]).includes(base)) {
    return base as Language;
  }
  return "en";
}
