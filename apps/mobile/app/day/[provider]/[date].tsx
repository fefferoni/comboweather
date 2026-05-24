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
    const matching = source.filter((h) => h.time.startsWith(date));
    return densityGradient(matching);
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
            <Text className="mt-2 text-sm text-ink-muted">{t("common.loading")}</Text>
          </View>
        ) : hours.length === 0 ? (
          <Text className="px-1 text-sm text-ink-muted">
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
        <Text className="text-xs text-ink-muted">
          {formatPrecip(hour.precipitation.amount)}
        </Text>
        <Text className="text-xs text-ink-muted">
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
 * Density gradient: hourly for the first 12h after `now`, every 3h until 24h,
 * every 6h after that. Falls back to the raw list if everything is in the past.
 */
function densityGradient(hours: HourPoint[]): HourPoint[] {
  if (hours.length === 0) return hours;
  const now = Date.now();
  const cutoffHourly = now + 12 * 60 * 60 * 1000;
  const cutoff3h = now + 24 * 60 * 60 * 1000;
  const out: HourPoint[] = [];
  for (const h of hours) {
    const t = Date.parse(h.time);
    if (!Number.isFinite(t)) continue;
    if (t < now - 60 * 60 * 1000) continue;
    if (t < cutoffHourly) {
      out.push(h);
      continue;
    }
    const hour = new Date(t).getUTCHours();
    if (t < cutoff3h) {
      if (hour % 3 === 0) out.push(h);
      continue;
    }
    if (hour % 6 === 0) out.push(h);
  }
  return out.length > 0 ? out : hours;
}
