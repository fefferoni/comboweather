import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type {
  Confidence,
  CurrentConditions,
  DayPoint,
  ProviderId,
} from "@combo/shared";
import { useForecast } from "../api/forecast";
import { useCurrentLocation } from "../hooks/useLocation";
import { AttributionFooter } from "./AttributionFooter";
import { DayCard } from "./DayCard";
import { HeroCurrent } from "./HeroCurrent";
import { SpreadDetail } from "./SpreadDetail";
import { providerLabel } from "../theme/colors";

type Variant = ProviderId | "combo";

interface DayRow {
  day: DayPoint;
  confidence: Confidence | undefined;
}

interface ScreenData {
  current: CurrentConditions | null;
  days: DayRow[];
  confidence: Confidence | undefined;
}

export function ForecastScreen({ variant }: { variant: Variant }) {
  const { status: locationStatus, refresh: refreshLocation } =
    useCurrentLocation();
  const coords =
    locationStatus.kind === "ready"
      ? { lat: locationStatus.lat, lon: locationStatus.lon }
      : null;
  const query = useForecast(coords);
  const [showSpread, setShowSpread] = useState(false);

  const screen = useMemo<ScreenData>(() => {
    const empty: ScreenData = {
      current: null,
      days: [],
      confidence: undefined,
    };
    if (!query.data) return empty;
    if (variant === "combo") {
      const combo = query.data.combo;
      return {
        current: combo.current,
        days: pickDayPoints(combo.daily).map((d) => ({
          day: d,
          confidence: d.confidence,
        })),
        confidence: combo.current.confidence,
      };
    }
    const provider = query.data.providers[variant];
    if (!provider) return empty;
    return {
      current: provider.current,
      days: pickDayPoints(provider.daily).map((d) => ({
        day: d,
        confidence: undefined,
      })),
      confidence: undefined,
    };
  }, [query.data, variant]);

  const isLoading =
    locationStatus.kind === "requesting" ||
    (locationStatus.kind === "ready" && query.isLoading);

  return (
    <SafeAreaView className="flex-1 bg-surface-alt dark:bg-surface-dark">
      <ScrollView
        contentContainerClassName="p-4 gap-4"
        refreshControl={
          <RefreshControl
            refreshing={query.isFetching && !query.isLoading}
            onRefresh={() => query.refetch()}
          />
        }
      >
        <Text className="text-2xl font-semibold text-ink dark:text-ink-inverse">
          {variant === "combo" ? "Consensus" : providerLabel[variant]}
        </Text>

        {locationStatus.kind === "denied" ? (
          <ErrorState
            title="Location permission needed"
            message="ComboWeather needs your location to fetch the local forecast. Enable it in Settings and pull to refresh."
            onRetry={refreshLocation}
          />
        ) : locationStatus.kind === "error" ? (
          <ErrorState
            title="Couldn't read location"
            message={locationStatus.message}
            onRetry={refreshLocation}
          />
        ) : query.isError && !query.data ? (
          <ErrorState
            title="Forecast unavailable"
            message={query.error?.message ?? "Unknown error"}
            onRetry={() => query.refetch()}
          />
        ) : isLoading || !screen.current ? (
          <View className="items-center py-16">
            <ActivityIndicator />
            <Text className="mt-2 text-sm text-ink-muted">
              {locationStatus.kind === "requesting"
                ? "Finding your location…"
                : "Loading forecast…"}
            </Text>
          </View>
        ) : (
          <>
            <HeroCurrent
              current={screen.current}
              {...(variant === "combo" && screen.confidence !== undefined
                ? {
                    confidence: screen.confidence,
                    onConfidenceTap: () => setShowSpread((v) => !v),
                  }
                : {})}
            />
            {variant === "combo" && showSpread && query.data ? (
              <SpreadDetail providers={query.data.providers} />
            ) : null}
            {screen.days.length === 0 ? (
              <Text className="text-sm text-ink-muted">
                No daily forecast available.
              </Text>
            ) : (
              <View className="gap-3">
                {screen.days.map((row) => (
                  <DayCard
                    key={row.day.date}
                    day={row.day}
                    {...(row.confidence !== undefined
                      ? { confidence: row.confidence }
                      : {})}
                  />
                ))}
              </View>
            )}
            <AttributionFooter
              provider={variant}
              {...(variant !== "combo" && query.data?.providers[variant]
                ? { url: query.data.providers[variant].attributionUrl }
                : {})}
            />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function pickDayPoints<T extends { date: string }>(days: T[]): T[] {
  // "Today (remaining)" + "Tomorrow" — index 0 and 1 of the canonical daily grid.
  return days.slice(0, 2);
}

function ErrorState({
  title,
  message,
  onRetry,
}: {
  title: string;
  message: string;
  onRetry: () => void;
}) {
  return (
    <View className="items-center gap-2 rounded-2xl bg-surface p-6 dark:bg-surface-darkAlt">
      <Text className="text-base font-semibold text-ink dark:text-ink-inverse">
        {title}
      </Text>
      <Text className="text-center text-sm text-ink-muted">{message}</Text>
      <Text
        onPress={onRetry}
        className="mt-2 text-sm font-medium text-sky-600"
        accessibilityRole="button"
      >
        Try again
      </Text>
    </View>
  );
}
