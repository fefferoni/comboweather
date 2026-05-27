import type { ForecastResponse, ProviderId } from "@combo/shared";
import { Text, View } from "react-native";
import { formatTempPrecise, formatWindSpeed } from "../format";
import { useT } from "../i18n";
import { providerLabel } from "../theme/colors";
import { useSettings } from "../store/settings";

export function SpreadDetail({
  providers,
}: {
  providers: ForecastResponse["providers"];
}) {
  const t = useT();
  const windUnit = useSettings((s) => s.windUnit);
  const ids: ProviderId[] = ["smhi", "met", "dmi"];
  const rows = ids
    .map((id) => ({ id, data: providers[id] }))
    .filter((r): r is { id: ProviderId; data: NonNullable<typeof r.data> } =>
      r.data !== undefined,
    );

  return (
    <View className="mt-2 rounded-2xl bg-surface-alt p-4 dark:bg-surface-darkAlt">
      <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted dark:text-ink-mutedDark">
        {t("forecast.providersDisagree")}
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
            {formatWindSpeed(data.current.wind.speed, windUnit)}
          </Text>
        </View>
      ))}
    </View>
  );
}
