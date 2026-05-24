import { Linking, Pressable, Text, View } from "react-native";
import type { ProviderId } from "@combo/shared";
import { providerAttributionUrl, providerLabel } from "../theme/colors";

export function AttributionFooter({
  provider,
  url,
}: {
  provider: ProviderId | "combo";
  /** Provider's attribution URL from the API response; falls back to a hardcoded value. */
  url?: string;
}) {
  if (provider === "combo") {
    return (
      <View className="mt-2 items-center">
        <Text className="text-xs text-ink-muted">
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
    >
      <Text className="text-xs text-ink-muted underline">
        Data from {providerLabel[provider]} · terms of use
      </Text>
    </Pressable>
  );
}
