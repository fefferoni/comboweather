import { t } from "./i18n";
import type { Language, WindUnit } from "./store/settings";

export function formatTemp(c: number): string {
  return `${Math.round(c)}°`;
}

export function formatTempPrecise(c: number): string {
  return `${c.toFixed(1)}°`;
}

export function formatWindSpeed(ms: number, unit: WindUnit = "ms"): string {
  if (unit === "kmh") {
    const v = (ms * 3.6).toFixed(1);
    return t("wind.kmh", { value: v });
  }
  return t("wind.ms", { value: ms.toFixed(1) });
}

const COMPASS = [
  "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
  "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW",
];
export function formatWindDirection(deg: number): string {
  const normalized = ((deg % 360) + 360) % 360;
  const idx = Math.round(normalized / 22.5) % 16;
  return COMPASS[idx] ?? "—";
}

export function formatPrecip(mm: number): string {
  if (mm < 0.1) return "0 mm";
  return `${mm.toFixed(1)} mm`;
}

export function formatProbability(p: number | undefined): string | null {
  if (p === undefined) return null;
  return t("forecast.precipChance", { value: Math.round(p * 100) });
}

const LOCALE_FOR_LANG: Record<Language, string> = {
  en: "en-GB",
  sv: "sv-SE",
};

function intlLocale(lang: Language | undefined): string {
  return lang ? LOCALE_FOR_LANG[lang] : "en-GB";
}

/** "Today" / "Tomorrow" / weekday name (i18n-aware). */
export function dayLabel(isoDate: string, language: Language | undefined): string {
  const d = new Date(`${isoDate}T00:00:00`);
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round(
    (startOfDay.getTime() - startOfToday.getTime()) / (24 * 60 * 60 * 1000),
  );
  if (diffDays === 0) return t("common.today");
  if (diffDays === 1) return t("common.tomorrow");
  return d.toLocaleDateString(intlLocale(language), { weekday: "long" });
}

export function dayLabelLong(isoDate: string, language: Language | undefined): string {
  const d = new Date(`${isoDate}T00:00:00`);
  return d.toLocaleDateString(intlLocale(language), {
    weekday: "long",
    day: "numeric",
    month: "short",
  });
}

export function formatHour(isoTime: string, language: Language | undefined): string {
  const d = new Date(isoTime);
  return d.toLocaleTimeString(intlLocale(language), {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
