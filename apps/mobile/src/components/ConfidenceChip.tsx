import type { Confidence } from "@combo/shared";
import { Pressable, Text, View } from "react-native";

const TONE: Record<Confidence, { dot: string; label: string }> = {
  high: { dot: "bg-emerald-500", label: "High confidence" },
  medium: { dot: "bg-amber-500", label: "Providers differ" },
  low: { dot: "bg-rose-500", label: "Providers disagree" },
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
  const { dot, label } = TONE[confidence];
  // Plain dot for "high" — chip only flags disagreement.
  if (confidence === "high" && compact) {
    return <View className={`h-2 w-2 rounded-full ${dot}`} />;
  }

  const Wrap = onPress ? Pressable : View;
  return (
    <Wrap
      className="flex-row items-center gap-2 self-start rounded-full bg-surface-alt px-3 py-1 dark:bg-surface-darkAlt"
      {...(onPress ? { onPress, accessibilityRole: "button" } : {})}
    >
      <View className={`h-2 w-2 rounded-full ${dot}`} />
      <Text className="text-xs font-medium text-ink-soft dark:text-ink-inverse">
        {label}
        {onPress ? " · tap to compare" : ""}
      </Text>
    </Wrap>
  );
}
