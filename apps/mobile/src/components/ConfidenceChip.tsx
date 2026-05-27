import type { Confidence } from "@combo/shared";
import { Pressable, Text, View } from "react-native";
import { useT } from "../i18n";

const DOT_FOR: Record<Confidence, string> = {
  high: "bg-emerald-500",
  medium: "bg-amber-500",
  low: "bg-rose-500",
};

export function ConfidenceChip({
  confidence,
  onPress,
  compact = false,
}: {
  confidence: Confidence;
  onPress?: () => void;
  compact?: boolean;
}) {
  const t = useT();
  const dot = DOT_FOR[confidence];
  const label =
    confidence === "high"
      ? t("common.confidenceHigh")
      : confidence === "medium"
        ? t("common.confidenceMedium")
        : t("forecast.providersDisagree");

  if (confidence === "high" && compact) {
    return <View className={`h-2 w-2 rounded-full ${dot}`} />;
  }

  const Wrap = onPress ? Pressable : View;
  return (
    <Wrap
      // Chip is rendered inside cards (Hero, DayCard) which are white in
      // light mode and surface-darkAlt (#1e293b) in dark mode. Match the
      // HeroCurrent pill lift exactly — slate-200 light / slate-600 dark —
      // so the chip reads as a distinct raised element in both themes.
      className="flex-row items-center gap-2 self-start rounded-full bg-slate-200 px-3 py-1 dark:bg-slate-600"
      {...(onPress ? { onPress, accessibilityRole: "button" } : {})}
    >
      <View className={`h-2 w-2 rounded-full ${dot}`} />
      <Text className="text-xs font-medium text-ink-soft dark:text-ink-inverse">
        {label}
      </Text>
    </Wrap>
  );
}
