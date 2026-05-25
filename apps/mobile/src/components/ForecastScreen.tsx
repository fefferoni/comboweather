import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import type {
  Confidence,
  CurrentConditions,
  DayPoint,
  ProviderId,
} from "@combo/shared";
import { useForecast } from "../api/forecast";
import { useActiveLocation } from "../hooks/useActiveLocation";
import { useT } from "../i18n";
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
  const t = useT();
  const router = useRouter();
  const { status: locationStatus, refresh: refreshLocation } =
    useActiveLocation();
  const coords =
    locationStatus.kind === "ready"
      ? { lat: locationStatus.lat, lon: locationStatus.lon }
      : null;
  const query = useForecast(coords);
  const [showSpread, setShowSpread] = useState(false);

  // The forecast query is shared across all 4 tabs (same hook, same key), so
  // `query.isFetching` is true on every tab whenever any tab triggered a
  // refetch. Binding RefreshControl directly to that would show a frozen,
  // non-animating spinner on the OTHER tabs the moment they mount — iOS
  // UIRefreshControl can't animate a `refreshing={true}` state that wasn't
  // user-initiated on this scrollview. We instead track a local flag that's
  // only set by THIS tab's pull-gesture and cleared when the fetch settles.
  const [userRefreshing, setUserRefreshing] = useState(false);
  useEffect(() => {
    if (userRefreshing && !query.isFetching) {
      setUserRefreshing(false);
    }
  }, [userRefreshing, query.isFetching]);

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

  // Per-provider failure is expected — the combo tab tolerates 1 or 2 providers
  // dropping out. On a provider tab, distinguish "still loading" from "fetched,
  // but this provider isn't in the response" so we don't spin forever (e.g.
  // when DMI's upstream momentarily fails and the cached response omits it).
  const providerMissing =
    variant !== "combo" &&
    !!query.data &&
    !query.data.providers[variant];

  function openDay(date: string) {
    router.push({
      pathname: "/day/[provider]/[date]",
      params: { provider: variant, date },
    });
  }

  function openWeek() {
    router.push({
      pathname: "/week/[provider]",
      params: { provider: variant },
    });
  }

  return (
    <ScrollView
      contentContainerClassName="p-4 gap-4"
      refreshControl={
        <RefreshControl
          refreshing={userRefreshing}
          onRefresh={() => {
            setUserRefreshing(true);
            query.refetch();
          }}
        />
      }
    >
      <Text className="text-2xl font-semibold text-ink dark:text-ink-inverse">
        {variant === "combo" ? t("screen.combo") : providerLabel[variant]}
      </Text>

      {locationStatus.kind === "denied" ? (
        <ErrorState
          title={t("errors.locationDenied.title")}
          message={t("errors.locationDenied.message")}
          onRetry={refreshLocation}
          retryLabel={t("common.tryAgain")}
        />
      ) : locationStatus.kind === "error" ? (
        <ErrorState
          title={t("errors.locationError.title")}
          message={locationStatus.message}
          onRetry={refreshLocation}
          retryLabel={t("common.tryAgain")}
        />
      ) : query.isError && !query.data ? (
        <ErrorState
          title={t("errors.forecastUnavailable.title")}
          message={query.error?.message ?? "Unknown error"}
          onRetry={() => query.refetch()}
          retryLabel={t("common.tryAgain")}
        />
      ) : providerMissing ? (
        <ErrorState
          title={t("errors.providerUnavailable.title", {
            provider: providerLabel[variant as ProviderId],
          })}
          message={t("errors.providerUnavailable.message", {
            provider: providerLabel[variant as ProviderId],
          })}
          onRetry={() => query.refetch()}
          retryLabel={t("common.tryAgain")}
        />
      ) : isLoading || !screen.current ? (
        <View className="items-center py-16">
          <ActivityIndicator />
          <Text className="mt-2 text-sm text-ink-muted">
            {locationStatus.kind === "requesting"
              ? t("common.findingLocation")
              : t("common.loading")}
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
              {t("forecast.noDaily")}
            </Text>
          ) : (
            <View className="gap-3">
              {screen.days.map((row) => (
                <Pressable
                  key={row.day.date}
                  onPress={() => openDay(row.day.date)}
                  accessibilityRole="button"
                  accessibilityLabel={`${t("forecast.viewHourly")} ${row.day.date}`}
                >
                  <DayCard
                    day={row.day}
                    {...(row.confidence !== undefined
                      ? { confidence: row.confidence }
                      : {})}
                  />
                </Pressable>
              ))}
            </View>
          )}
          <Pressable
            onPress={openWeek}
            className="self-center rounded-full bg-surface-alt px-4 py-2 dark:bg-surface-darkAlt"
            accessibilityRole="button"
          >
            <Text className="text-sm font-medium text-sky-600">
              {t("forecast.viewWeek")}
            </Text>
          </Pressable>
          <AttributionFooter
            provider={variant}
            {...(variant !== "combo" && query.data?.providers[variant]
              ? { url: query.data.providers[variant].attributionUrl }
              : {})}
          />
        </>
      )}
    </ScrollView>
  );
}

function pickDayPoints<T extends { date: string }>(days: T[]): T[] {
  return days.slice(0, 2);
}

function ErrorState({
  title,
  message,
  onRetry,
  retryLabel,
}: {
  title: string;
  message: string;
  onRetry: () => void;
  retryLabel: string;
}) {
  return (
    <View className="items-center gap-2 rounded-2xl bg-surface p-6 dark:bg-surface-darkAlt">
      <Text className="text-base font-semibold text-ink dark:text-ink-inverse">
        {title}
      </Text>
      <Text className="text-center text-sm text-ink-muted">{message}</Text>
      <Pressable
        onPress={onRetry}
        className="mt-2 rounded-full bg-sky-600 px-4 py-2"
        accessibilityRole="button"
      >
        <Text className="text-sm font-medium text-white">{retryLabel}</Text>
      </Pressable>
    </View>
  );
}
