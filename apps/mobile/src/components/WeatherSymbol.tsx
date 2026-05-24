import { Text, View } from "react-native";

// MET weathericons would be the canonical SVG/PNG set; bundling them is deferred
// to v0.4 visual polish. For now we map every MET symbol_code root to a single
// emoji so the hero card has a recognizable glyph without 100+ binary assets.
const SYMBOL_TO_EMOJI: Record<string, string> = {
  clearsky: "☀️",
  fair: "🌤️",
  partlycloudy: "⛅",
  cloudy: "☁️",
  fog: "🌫️",
  lightrainshowers: "🌦️",
  rainshowers: "🌦️",
  heavyrainshowers: "🌧️",
  lightrain: "🌧️",
  rain: "🌧️",
  heavyrain: "🌧️",
  lightsleet: "🌨️",
  sleet: "🌨️",
  heavysleet: "🌨️",
  lightsnow: "🌨️",
  snow: "❄️",
  heavysnow: "❄️",
  lightsnowshowers: "🌨️",
  snowshowers: "🌨️",
  heavysnowshowers: "🌨️",
  thunder: "⛈️",
  rainshowersandthunder: "⛈️",
  rainandthunder: "⛈️",
  heavyrainandthunder: "⛈️",
  sleetandthunder: "⛈️",
  snowandthunder: "⛈️",
};

function rootOf(symbol: string): string {
  // Strip `_day` / `_night` / `_polartwilight` suffixes and any numeric suffix.
  return symbol.replace(/_(day|night|polartwilight).*$/, "");
}

export function WeatherSymbol({
  symbol,
  size = 72,
}: {
  symbol: string;
  size?: number;
}) {
  const root = rootOf(symbol);
  const glyph = SYMBOL_TO_EMOJI[root] ?? "🌡️";
  return (
    <View accessibilityLabel={symbol.replace(/_/g, " ")}>
      <Text style={{ fontSize: size }}>{glyph}</Text>
    </View>
  );
}
