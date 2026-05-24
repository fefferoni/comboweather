import {
  dayLabel,
  dayLabelLong,
  formatHour,
  formatWindSpeed,
} from "../format";
import { useSettings } from "../store/settings";

/**
 * Bundles formatters that depend on user settings (language, wind unit).
 * Components grab one of these via `useFormat()` instead of threading
 * language/unit through props.
 */
export function useFormat() {
  const language = useSettings((s) => s.language);
  const windUnit = useSettings((s) => s.windUnit);
  return {
    dayLabel: (date: string) => dayLabel(date, language),
    dayLabelLong: (date: string) => dayLabelLong(date, language),
    hour: (iso: string) => formatHour(iso, language),
    wind: (ms: number) => formatWindSpeed(ms, windUnit),
  };
}
