import type { ForecastResponse, ProviderId } from "@combo/shared";
import { Text, View } from "react-native";
import { formatTempPrecise } from "../format";
import { providerLabel } from "../theme/colors";

// Surfaces per-provider readings for the current hero values so the user can
// see exactly what's being combined. Triggered by tapping the confidence chip
// on the Combo tab.
export function SpreadDetail({
  providers,
}: {
  providers: ForecastResponse["providers"];
}) {
  const ids: ProviderId[] = ["smhi", "met", "dmi"];
  const rows = ids
    .map((id) => ({ id, data: providers[id] }))
    .filter((r): r is { id: ProviderId; data: NonNullable<typeof r.data> } =>
      r.data !== undefined,
    );

  return (
    <View className="mt-2 rounded-2xl bg-surface-alt p-4 dark:bg-surface-dark">
      <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
        Right now, per provider
      </Text>
      {rows.map(({ id, data }) => (
        <View
          key={id}
          className="flex-row items-center justify-between py-1.5"
        >
          <Text className="text-sm text-ink dark:text-ink-inverse">
            {providerLabel[id]}
          </Text>
          <Text className="text-sm text-ink-soft dark:text-ink-inverse">
            {formatTempPrecise(data.current.temperature)} ·{" "}
            {data.current.wind.speed.toFixed(1)} m/s
          </Text>
        </View>
      ))}
    </View>
  );
}
