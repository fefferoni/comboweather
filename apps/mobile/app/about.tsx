import { Linking, Pressable, ScrollView, Text, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import Constants from "expo-constants";
import { useT } from "../src/i18n";

const VERSION =
  Constants.expoConfig?.version ?? Constants.expoVersion ?? "0.4.0";

const LINKS = {
  smhi: "https://opendata.smhi.se/",
  met: "https://api.met.no/doc/TermsOfService",
  dmi: "https://www.dmi.dk/frie-data",
  nominatim: "https://operations.osmfoundation.org/policies/nominatim/",
  repo: "https://github.com/fefferoni/comboweather",
};

export default function AboutScreen() {
  const router = useRouter();
  const t = useT();

  return (
    <SafeAreaView className="flex-1 bg-surface-alt dark:bg-surface-dark">
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-row items-center justify-between px-4 py-3">
        <Pressable
          onPress={() => router.back()}
          className="rounded-full bg-surface px-3 py-2 dark:bg-surface-darkAlt"
          accessibilityRole="button"
        >
          <Text className="text-sm text-ink dark:text-ink-inverse">
            ← {t("common.back")}
          </Text>
        </Pressable>
        <Text className="text-base font-semibold text-ink dark:text-ink-inverse">
          {t("about.title")}
        </Text>
        <View style={{ width: 64 }} />
      </View>

      <ScrollView contentContainerClassName="p-4 gap-6">
        <View className="rounded-2xl bg-surface p-4 dark:bg-surface-darkAlt">
          <Text className="text-xl font-semibold text-ink dark:text-ink-inverse">
            ComboWeather
          </Text>
          <Text className="mt-1 text-sm text-ink-muted">
            {t("about.tagline")}
          </Text>
          <Text className="mt-3 text-xs text-ink-muted">
            {t("about.version", { version: VERSION })}
          </Text>
        </View>

        <View className="gap-2">
          <Text className="text-xs uppercase tracking-wider text-ink-muted">
            {t("about.dataSources")}
          </Text>
          <AttributionRow text={t("about.smhi")} url={LINKS.smhi} />
          <AttributionRow text={t("about.met")} url={LINKS.met} />
          <AttributionRow text={t("about.dmi")} url={LINKS.dmi} />
          <AttributionRow text={t("about.geocoder")} url={LINKS.nominatim} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function AttributionRow({ text, url }: { text: string; url: string }) {
  return (
    <Pressable
      onPress={() => Linking.openURL(url)}
      className="rounded-2xl bg-surface p-4 dark:bg-surface-darkAlt"
      accessibilityRole="link"
    >
      <Text className="text-sm text-ink dark:text-ink-inverse">{text}</Text>
      <Text className="mt-1 text-xs text-sky-600">{url}</Text>
    </Pressable>
  );
}
