import {
  dayLabel,
  dayLabelLong,
  formatHour,
  formatWindSpeed,
} from "../format";
import { activeLanguage } from "../i18n";
import { useSettings } from "../store/settings";

/**
 * Bundles formatters that depend on user settings (language, wind unit).
 * Components grab one of these via `useFormat()` instead of threading
 * language/unit through props.
 *
 * When `settings.language` is undefined (= "follow device default"), we
 * resolve to the active i18n locale instead of passing undefined through
 * — otherwise `Intl.DateTimeFormat` defaults to en-GB and the week view's
 * weekday names render in English even when the rest of the UI is Swedish.
 */
export function useFormat() {
  const language = useSettings((s) => s.language) ?? activeLanguage();
  const windUnit = useSettings((s) => s.windUnit);
  return {
    dayLabel: (date: string) => dayLabel(date, language),
    dayLabelLong: (date: string) => dayLabelLong(date, language),
    hour: (iso: string) => formatHour(iso, language),
    wind: (ms: number) => formatWindSpeed(ms, windUnit),
  };
}
