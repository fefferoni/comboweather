// Provider attribution accents (kept tonally restrained — saturated only on the
// chip backgrounds, not the long-form text).
export const providerAccent = {
  smhi: "bg-sky-600",
  met: "bg-emerald-600",
  dmi: "bg-rose-600",
  combo: "bg-slate-700",
} as const;

export const providerLabel = {
  smhi: "SMHI",
  met: "MET Norway",
  dmi: "DMI",
  combo: "Combo",
} as const;

// Fallback URLs. The API response's `attributionUrl` field is preferred
// (single source of truth — backend bumps propagate without a mobile release);
// these are only used if the response is missing the field.
export const providerAttributionUrl = {
  smhi: "https://opendata.smhi.se/",
  met: "https://api.met.no/doc/TermsOfService",
  dmi: "https://www.dmi.dk/frie-data",
} as const;
