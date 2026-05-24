import "../global.css";

import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { colorScheme as nwColorScheme } from "nativewind";
import { initSentry } from "../src/sentry";
import { useSettings } from "../src/store/settings";

initSentry();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 2,
    },
  },
});

export default function RootLayout() {
  const systemScheme = useColorScheme();
  const themePref = useSettings((s) => s.theme);

  useEffect(() => {
    nwColorScheme.set(themePref);
  }, [themePref]);

  const effectiveScheme =
    themePref === "system" ? (systemScheme ?? "light") : themePref;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="search" options={{ presentation: "modal" }} />
            <Stack.Screen name="settings" />
            <Stack.Screen name="about" />
            <Stack.Screen name="day/[provider]/[date]" />
            <Stack.Screen name="week/[provider]" />
          </Stack>
          <StatusBar style={effectiveScheme === "dark" ? "light" : "dark"} />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
