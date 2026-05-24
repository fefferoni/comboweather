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
import type { DayPoint, ProviderId } from "@combo/shared";
import { useForecast } from "../../src/api/forecast";
import { useActiveLocation } from "../../src/hooks/useActiveLocation";
import { useFormat } from "../../src/hooks/useFormat";
import { useT } from "../../src/i18n";
import { providerLabel } from "../../src/theme/colors";
import { DayCard } from "../../src/components/DayCard";

type Variant = ProviderId | "combo";

function isVariant(value: string | undefined): value is Variant {
  return value === "combo" || value === "smhi" || value === "met" || value === "dmi";
}

export default function WeekScreen() {
  const params = useLocalSearchParams<{ provider: string }>();
  const router = useRouter();
  const t = useT();
  const fmt = useFormat();

  const variant: Variant = isVariant(params.provider) ? params.provider : "combo";

  const { status } = useActiveLocation();
  const coords = status.kind === "ready" ? { lat: status.lat, lon: status.lon } : null;
  const query = useForecast(coords);

  const days = useMemo<{ day: DayPoint; confidence?: "high" | "medium" | "low" }[]>(() => {
    if (!query.data) return [];
    if (variant === "combo") {
      return query.data.combo.daily.map((d) => ({
        day: d,
        confidence: d.confidence,
      }));
    }
    const provider = query.data.providers[variant];
    return provider ? provider.daily.map((d) => ({ day: d })) : [];
  }, [query.data, variant]);

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
          {title} · {t("forecast.viewWeek").replace(" →", "")}
        </Text>
        <View style={{ width: 64 }} />
      </View>

      <ScrollView contentContainerClassName="p-4 gap-3">
        {query.isLoading || !query.data ? (
          <View className="items-center py-12">
            <ActivityIndicator />
            <Text className="mt-2 text-sm text-ink-muted">
              {t("common.loading")}
            </Text>
          </View>
        ) : days.length === 0 ? (
          <Text className="text-sm text-ink-muted">{t("forecast.noDaily")}</Text>
        ) : (
          days.map((row) => (
            <Pressable
              key={row.day.date}
              onPress={() =>
                router.push({
                  pathname: "/day/[provider]/[date]",
                  params: { provider: variant, date: row.day.date },
                })
              }
              accessibilityRole="button"
              accessibilityLabel={fmt.dayLabelLong(row.day.date)}
            >
              <DayCard
                day={row.day}
                {...(row.confidence ? { confidence: row.confidence } : {})}
              />
            </Pressable>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

