import type { DayPoint, Confidence } from "@combo/shared";
import { Text, View } from "react-native";
import { dayLabel, formatPrecip, formatProbability, formatTemp } from "../format";
import { ConfidenceChip } from "./ConfidenceChip";
import { WeatherSymbol } from "./WeatherSymbol";

export function DayCard({
  day,
  confidence,
}: {
  day: DayPoint;
  confidence?: Confidence;
}) {
  const prob = formatProbability(day.precipitation.probability);
  return (
    <View className="flex-row items-center justify-between rounded-2xl bg-surface p-4 dark:bg-surface-darkAlt">
      <View className="flex-1">
        <View className="flex-row items-center gap-2">
          <Text className="text-base font-semibold text-ink dark:text-ink-inverse">
            {dayLabel(day.date)}
          </Text>
          {confidence && confidence !== "high" ? (
            <ConfidenceChip confidence={confidence} compact />
          ) : null}
        </View>
        <Text className="mt-1 text-xs text-ink-muted">
          {formatPrecip(day.precipitation.amount)}
          {prob ? ` · ${prob}` : ""}
        </Text>
      </View>
      <View className="flex-row items-center gap-3">
        <WeatherSymbol symbol={day.symbol} size={40} />
        <View className="items-end">
          <Text className="text-base font-medium text-ink dark:text-ink-inverse">
            {formatTemp(day.tempMax)}
          </Text>
          <Text className="text-sm text-ink-muted">{formatTemp(day.tempMin)}</Text>
        </View>
      </View>
    </View>
  );
}
