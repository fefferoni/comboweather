import { Tabs, useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useT } from "../../src/i18n";
import { useActiveLocation } from "../../src/hooks/useActiveLocation";

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  return (
    <Text
      style={{
        fontSize: 11,
        fontWeight: focused ? "600" : "400",
        color: focused ? "#0284c7" : "#64748b",
      }}
    >
      {label}
    </Text>
  );
}

/**
 * Shared header above the tab content: location chip on the left (opens
 * /search), gear on the right (opens /settings). Lives in the tabs layout so
 * every tab gets the same affordances without re-rendering on tab change.
 */
function AppHeader() {
  const router = useRouter();
  const t = useT();
  const { status } = useActiveLocation();
  const label =
    status.kind === "ready" && "source" in status && status.source === "favorite"
      ? status.label
      : status.kind === "ready"
        ? "GPS"
        : t("header.location");

  return (
    <SafeAreaView edges={["top"]} className="bg-surface-alt dark:bg-surface-dark">
      <View className="flex-row items-center justify-between px-4 py-2">
        <Pressable
          onPress={() => router.push("/search")}
          className="flex-row items-center gap-2 rounded-full bg-surface px-3 py-2 dark:bg-surface-darkAlt"
          accessibilityRole="button"
          accessibilityLabel={t("header.location")}
        >
          <Text className="text-xs text-ink-muted">◉</Text>
          <Text
            className="max-w-[180px] text-sm text-ink dark:text-ink-inverse"
            numberOfLines={1}
          >
            {label}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => router.push("/settings")}
          className="rounded-full bg-surface px-3 py-2 dark:bg-surface-darkAlt"
          accessibilityRole="button"
          accessibilityLabel={t("header.settings")}
        >
          <Text className="text-sm text-ink dark:text-ink-inverse">⚙︎</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

export default function TabsLayout() {
  const t = useT();
  return (
    <View className="flex-1 bg-surface-alt dark:bg-surface-dark">
      <AppHeader />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: false,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: t("tabs.combo"),
            tabBarIcon: ({ focused }) => (
              <TabIcon label={t("tabs.combo")} focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="smhi"
          options={{
            title: t("tabs.smhi"),
            tabBarIcon: ({ focused }) => (
              <TabIcon label={t("tabs.smhi")} focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="met"
          options={{
            title: t("tabs.met"),
            tabBarIcon: ({ focused }) => (
              <TabIcon label={t("tabs.met")} focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="dmi"
          options={{
            title: t("tabs.dmi"),
            tabBarIcon: ({ focused }) => (
              <TabIcon label={t("tabs.dmi")} focused={focused} />
            ),
          }}
        />
      </Tabs>
    </View>
  );
}
