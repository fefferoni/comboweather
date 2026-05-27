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
  // Pill sits inside the hero card. It needs to read as a raised chip, so
  // it must be a clearly distinct shade from the card surface in BOTH
  // themes: slate-200 (#e2e8f0) on the white light card, slate-600
  // (#475569) on the surface-darkAlt (#1e293b) dark card. A single-step
  // lift (slate-700 on slate-800) was too subtle to register on-device.
  return (
    <View className="rounded-full bg-slate-200 px-3 py-1 dark:bg-slate-600">
      <Text className="text-xs font-medium text-ink-soft dark:text-ink-inverse">
        {text}
      </Text>
    </View>
  );
}
