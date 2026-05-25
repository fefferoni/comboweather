import { Tabs, useRouter } from "expo-router";
import { Pressable, Text, View, useColorScheme } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useT } from "../../src/i18n";
import { useActiveLocation } from "../../src/hooks/useActiveLocation";

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
          <Text className="text-sm text-ink-muted">◉</Text>
          <Text
            className="max-w-[180px] text-sm font-medium text-ink dark:text-ink-inverse"
            numberOfLines={1}
          >
            {label}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => router.push("/settings")}
          className="h-11 w-11 items-center justify-center rounded-full bg-surface dark:bg-surface-darkAlt"
          accessibilityRole="button"
          accessibilityLabel={t("header.settings")}
          hitSlop={8}
        >
          {/* The unicode gear renders ~10% smaller than other glyphs at the
              same point size, so we have to oversize the font and pad the
              line height to recenter it inside the 44pt circle. */}
          <Text className="text-3xl leading-9 text-ink dark:text-ink-inverse">
            ⚙︎
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

export default function TabsLayout() {
  const t = useT();
  const scheme = useColorScheme();
  const isDark = scheme === "dark";

  return (
    <View className="flex-1 bg-surface-alt dark:bg-surface-dark">
      <AppHeader />
      <Tabs
        screenOptions={{
          headerShown: false,
          // React Navigation 7 puts each tab's content inside a "scene"
          // container with its own default background (~#1C1C1E in dark
          // mode), which would otherwise show through and make the body
          // look muted-grey instead of true black. sceneStyle overrides it.
          sceneStyle: {
            backgroundColor: isDark ? "#000000" : "#f1f5f9",
          },
          // Hide the icon slot (we'd otherwise get a blank space above each
          // label) and render labels at full tab width so "Combo" can't
          // line-wrap to "Com / bo" on narrower iPhones.
          tabBarIcon: () => null,
          tabBarLabelStyle: { fontSize: 12, fontWeight: "500" },
          tabBarItemStyle: { paddingVertical: 6 },
          tabBarStyle: {
            backgroundColor: isDark ? "#000000" : "#ffffff",
            borderTopColor: isDark ? "#1e293b" : "#e2e8f0",
          },
          tabBarActiveTintColor: "#0284c7",
          tabBarInactiveTintColor: isDark ? "#94a3b8" : "#64748b",
        }}
      >
        <Tabs.Screen name="index" options={{ title: t("tabs.combo") }} />
        <Tabs.Screen name="smhi" options={{ title: t("tabs.smhi") }} />
        <Tabs.Screen name="met" options={{ title: t("tabs.met") }} />
        <Tabs.Screen name="dmi" options={{ title: t("tabs.dmi") }} />
      </Tabs>
    </View>
  );
}
