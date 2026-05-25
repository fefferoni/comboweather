import { useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import type {
  ComboForecast,
  HourPoint,
  ProviderForecast,
  ProviderId,
} from "@combo/shared";
import { useForecast } from "../../../src/api/forecast";
import { useActiveLocation } from "../../../src/hooks/useActiveLocation";
import { useFormat } from "../../../src/hooks/useFormat";
import { useT } from "../../../src/i18n";
import { providerLabel } from "../../../src/theme/colors";
import {
  formatPrecip,
  formatTemp,
  formatWindDirection,
} from "../../../src/format";
import { WeatherSymbol } from "../../../src/components/WeatherSymbol";

type Variant = ProviderId | "combo";

function isVariant(value: string | undefined): value is Variant {
  return value === "combo" || value === "smhi" || value === "met" || value === "dmi";
}

export default function HourlyDrillDownScreen() {
  const params = useLocalSearchParams<{ provider: string; date: string }>();
  const router = useRouter();
  const t = useT();
  const fmt = useFormat();

  const variant: Variant = isVariant(params.provider) ? params.provider : "combo";
  const date = typeof params.date === "string" ? params.date : "";

  const { status } = useActiveLocation();
  const coords = status.kind === "ready" ? { lat: status.lat, lon: status.lon } : null;
  const query = useForecast(coords);

  const hours = useMemo(() => {
    if (!query.data || !date) return [];
    const source: HourPoint[] = pickHours(query.data, variant);
    return hoursForDate(source, date);
  }, [query.data, variant, date]);

  const title = variant === "combo"
    ? t("screen.combo")
    : providerLabel[variant];

  return (
    <SafeAreaView className="flex-1 bg-surface-alt dark:bg-surface-dark">
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-row items-center justify-between px-4 py-3">
        <Pressable
          onPress={() => router.back()}
          className="rounded-full bg-surface px-3 py-2 dark:bg-surface-darkAlt"
          accessibilityRole="button"
        >
          <Text className="text-sm text-ink dark:text-ink-inverse">
            ← {t("common.back")}
          </Text>
        </Pressable>
        <Text className="text-base font-semibold text-ink dark:text-ink-inverse">
          {title}
        </Text>
        <View style={{ width: 64 }} />
      </View>

      <ScrollView contentContainerClassName="p-4 gap-3">
        <View className="rounded-2xl bg-surface p-4 dark:bg-surface-darkAlt">
          <Text className="text-xl font-semibold text-ink dark:text-ink-inverse">
            {date ? fmt.dayLabelLong(date) : ""}
          </Text>
        </View>

        {query.isLoading || !query.data ? (
          <View className="items-center py-12">
            <ActivityIndicator />
            <Text className="mt-2 text-sm text-ink-muted dark:text-ink-mutedDark">{t("common.loading")}</Text>
          </View>
        ) : hours.length === 0 ? (
          <Text className="px-1 text-sm text-ink-muted dark:text-ink-mutedDark">
            {t("forecast.noDaily")}
          </Text>
        ) : (
          hours.map((h) => <HourRow key={h.time} hour={h} fmt={fmt} />)
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function HourRow({
  hour,
  fmt,
}: {
  hour: HourPoint;
  fmt: ReturnType<typeof useFormat>;
}) {
  return (
    <View className="flex-row items-center justify-between rounded-2xl bg-surface p-3 dark:bg-surface-darkAlt">
      <Text className="w-14 text-sm font-medium text-ink dark:text-ink-inverse">
        {fmt.hour(hour.time)}
      </Text>
      <WeatherSymbol symbol={hour.symbol} size={36} />
      <Text className="w-14 text-right text-base font-medium text-ink dark:text-ink-inverse">
        {formatTemp(hour.temperature)}
      </Text>
      <View className="w-20 items-end">
        <Text className="text-xs text-ink-muted dark:text-ink-mutedDark">
          {formatPrecip(hour.precipitation.amount)}
        </Text>
        <Text className="text-xs text-ink-muted dark:text-ink-mutedDark">
          {fmt.wind(hour.wind.speed)} {formatWindDirection(hour.wind.direction)}
        </Text>
      </View>
    </View>
  );
}

function pickHours(
  data: { combo: ComboForecast; providers: Record<string, ProviderForecast | undefined> },
  variant: Variant,
): HourPoint[] {
  if (variant === "combo") return data.combo.hourly;
  return data.providers[variant]?.hourly ?? [];
}

/**
 * Show every hour the upstream provider returned for `date`. Today is trimmed
 * to "from now onward" (we drop hours more than ~1h in the past so the row
 * the user just left in the day-card view doesn't pollute the drill-down).
 * Resolution is whatever the provider gave us — SMHI ships 1h for the first
 * ~36h then 3h, MET 1h for ~48h then 6h. We deliberately do NOT thin the
 * grid further: the drill-down is the place users zoom in to ask "what's it
 * like at 8am?", and a uniform 3h grid for "tomorrow" defeats that.
 *
 * The backend's `daily[].date` is currently keyed by UTC civil date (an
 * unfinished v0.4 todo flagged in `apps/api/src/providers/smhi.ts`). The
 * user reads day-card labels in *local* time though — Stockholm summer is
 * UTC+2, so a card labelled "Tomorrow" would otherwise drill into UTC-day
 * hours that display as local 02:00 → next-day 01:00. We sidestep that by
 * filtering the hourly list on each hour's *local* civil date instead of
 * its UTC date. Safe for Nordics (UTC+1/+2 only); revisit if we ever ship
 * a non-Nordic build.
 */
function hoursForDate(hours: HourPoint[], date: string): HourPoint[] {
  const matching = hours.filter((h) => localDateOf(h.time) === date);
  if (matching.length === 0) return matching;
  const cutoff = Date.now() - 60 * 60 * 1000;
  const trimmed = matching.filter((h) => {
    const t = Date.parse(h.time);
    return !Number.isFinite(t) || t >= cutoff;
  });
  return trimmed.length > 0 ? trimmed : matching;
}

function localDateOf(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
