import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type ThemePreference = "system" | "light" | "dark";
export type Language = "en" | "sv";
export type WindUnit = "ms" | "kmh";

export interface SettingsState {
  theme: ThemePreference;
  /** undefined → follow device locale. */
  language: Language | undefined;
  windUnit: WindUnit;
  hasHydrated: boolean;
  setTheme: (theme: ThemePreference) => void;
  setLanguage: (language: Language | undefined) => void;
  setWindUnit: (unit: WindUnit) => void;
}

interface PersistedSettings {
  theme: ThemePreference;
  language: Language | undefined;
  windUnit: WindUnit;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      theme: "system",
      language: undefined,
      windUnit: "ms",
      hasHydrated: false,
      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
      setWindUnit: (windUnit) => set({ windUnit }),
    }),
    {
      name: "comboweather:settings",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ theme, language, windUnit }): PersistedSettings => ({
        theme,
        language,
        windUnit,
      }),
      onRehydrateStorage: () => (state) => {
        // Tell consumers it's safe to read persisted values; gates the initial
        // i18n locale + theme application.
        if (state) useSettings.setState({ hasHydrated: true });
      },
    },
  ),
);
