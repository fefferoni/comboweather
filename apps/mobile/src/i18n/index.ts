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
