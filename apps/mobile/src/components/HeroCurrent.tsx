import type { CurrentConditions, Confidence } from "@combo/shared";
import { Text, View } from "react-native";
import { formatTemp, formatWindDirection } from "../format";
import { useFormat } from "../hooks/useFormat";
import { useT } from "../i18n";
import { ConfidenceChip } from "./ConfidenceChip";
import { WeatherSymbol } from "./WeatherSymbol";

export function HeroCurrent({
  current,
  confidence,
  onConfidenceTap,
}: {
  current: CurrentConditions;
  confidence?: Confidence;
  onConfidenceTap?: () => void;
}) {
  const fmt = useFormat();
  const t = useT();
  return (
    <View className="rounded-3xl bg-surface p-6 shadow-sm dark:bg-surface-darkAlt">
      <View className="flex-row items-center justify-between">
        <View className="flex-shrink">
          <Text className="text-7xl font-light text-ink dark:text-ink-inverse">
            {formatTemp(current.temperature)}
          </Text>
          {current.feelsLike !== undefined ? (
            <Text className="mt-1 text-sm text-ink-muted dark:text-ink-mutedDark">
              {t("forecast.feelsLike", { value: formatTemp(current.feelsLike) })}
            </Text>
          ) : null}
        </View>
        <WeatherSymbol symbol={current.symbol} size={84} />
      </View>

      <View className="mt-4 flex-row gap-3">
        <Pill text={`${fmt.wind(current.wind.speed)} ${formatWindDirection(current.wind.direction)}`} />
        {current.cloudCover !== undefined ? (
          <Pill text={`${Math.round(current.cloudCover * 100)}% ☁`} />
        ) : null}
      </View>

      {confidence !== undefined ? (
        <View className="mt-4">
          <ConfidenceChip
            confidence={confidence}
            {...(onConfidenceTap ? { onPress: onConfidenceTap } : {})}
          />
        </View>
      ) : null}
    </View>
  );
}

function Pill({ text }: { text: string }) {
  // Pill sits inside the hero card. In dark mode the card surface is
  // surface-darkAlt (#1e293b), so the pill needs a *lighter* shade
  // (slate-700, #334155) to read as a raised chip rather than a hole.
  return (
    <View className="rounded-full bg-surface-alt px-3 py-1 dark:bg-slate-700">
      <Text className="text-xs font-medium text-ink-soft dark:text-ink-inverse">
        {text}
      </Text>
    </View>
  );
}
