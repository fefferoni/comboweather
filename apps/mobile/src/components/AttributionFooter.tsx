import { Linking, Pressable, Text, View } from "react-native";
import type { ProviderId } from "@combo/shared";
import { providerAttributionUrl, providerLabel } from "../theme/colors";

export function AttributionFooter({
  provider,
  url,
}: {
  provider: ProviderId | "combo";
  url?: string;
}) {
  if (provider === "combo") {
    return (
      <View className="mt-2 items-center">
        <Text className="text-xs text-ink-muted dark:text-ink-mutedDark">
          Data: SMHI · MET Norway · DMI
        </Text>
      </View>
    );
  }
  const href = url ?? providerAttributionUrl[provider];
  return (
    <Pressable
      onPress={() => Linking.openURL(href).catch(() => undefined)}
      className="mt-2 items-center"
      accessibilityRole="link"
    >
      <Text className="text-xs text-sky-600 underline dark:text-sky-400">
        Data from {providerLabel[provider]} · terms of use
      </Text>
    </Pressable>
  );
}
