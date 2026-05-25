import { Pressable, ScrollView, Text, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useT } from "../src/i18n";
import {
  useSettings,
  type Language,
  type ThemePreference,
  type WindUnit,
} from "../src/store/settings";

export default function SettingsScreen() {
  const router = useRouter();
  const t = useT();
  const theme = useSettings((s) => s.theme);
  const language = useSettings((s) => s.language);
  const windUnit = useSettings((s) => s.windUnit);
  const setTheme = useSettings((s) => s.setTheme);
  const setLanguage = useSettings((s) => s.setLanguage);
  const setWindUnit = useSettings((s) => s.setWindUnit);

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
          {t("settings.title")}
        </Text>
        <View style={{ width: 64 }} />
      </View>

      <ScrollView contentContainerClassName="p-4 gap-6">
        <Section title={t("settings.theme")}>
          <SegmentedRow<ThemePreference>
            value={theme}
            onChange={setTheme}
            options={[
              { value: "system", label: t("settings.themeSystem") },
              { value: "light", label: t("settings.themeLight") },
              { value: "dark", label: t("settings.themeDark") },
            ]}
          />
        </Section>

        <Section title={t("settings.language")}>
          <SegmentedRow<Language | "system">
            value={language ?? "system"}
            onChange={(v) => setLanguage(v === "system" ? undefined : v)}
            options={[
              { value: "system", label: t("settings.languageSystem") },
              { value: "en", label: t("settings.languageEnglish") },
              { value: "sv", label: t("settings.languageSwedish") },
            ]}
          />
        </Section>

        <Section title={t("settings.windUnit")}>
          <SegmentedRow<WindUnit>
            value={windUnit}
            onChange={setWindUnit}
            options={[
              { value: "ms", label: t("settings.windUnitMs") },
              { value: "kmh", label: t("settings.windUnitKmh") },
            ]}
          />
        </Section>

        <Pressable
          onPress={() => router.push("/about")}
          className="rounded-2xl bg-surface p-4 dark:bg-surface-darkAlt"
          accessibilityRole="button"
        >
          <Text className="text-base text-ink dark:text-ink-inverse">
            {t("settings.about")} →
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View className="gap-2">
      <Text className="text-xs uppercase tracking-wider text-ink-muted dark:text-ink-mutedDark">
        {title}
      </Text>
      {children}
    </View>
  );
}

function SegmentedRow<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (next: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <View className="flex-row gap-2">
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            className={
              selected
                ? "flex-1 rounded-2xl bg-sky-600 p-3"
                : "flex-1 rounded-2xl bg-surface p-3 dark:bg-surface-darkAlt"
            }
            accessibilityRole="button"
            accessibilityState={{ selected }}
          >
            <Text
              className={
                selected
                  ? "text-center text-sm font-semibold text-white"
                  : "text-center text-sm text-ink dark:text-ink-inverse"
              }
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
