export function formatTemp(c: number): string {
  return `${Math.round(c)}°`;
}

export function formatTempPrecise(c: number): string {
  return `${c.toFixed(1)}°`;
}

export function formatWindSpeed(ms: number): string {
  return `${ms.toFixed(1)} m/s`;
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
  return `${Math.round(p * 100)}%`;
}

// Returns "Today" / "Tomorrow" / weekday name for the first matching day.
export function dayLabel(isoDate: string, locale = "en-GB"): string {
  const d = new Date(`${isoDate}T00:00:00`);
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round(
    (startOfDay.getTime() - startOfToday.getTime()) / (24 * 60 * 60 * 1000),
  );
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  return d.toLocaleDateString(locale, { weekday: "long" });
}
