import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import type { SearchResult } from "@combo/shared";
import { useSearch } from "../src/api/search";
import { useT } from "../src/i18n";
import { useFavorites, type Favorite } from "../src/store/favorites";
import { useSettings } from "../src/store/settings";

export default function SearchScreen() {
  const router = useRouter();
  const t = useT();
  const language = useSettings((s) => s.language);

  const [raw, setRaw] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const handle = setTimeout(() => setDebounced(raw), 350);
    return () => clearTimeout(handle);
  }, [raw]);

  const search = useSearch(debounced, language);
  const items = useFavorites((s) => s.items);
  const active = useFavorites((s) => s.active);
  const setActive = useFavorites((s) => s.setActive);
  const add = useFavorites((s) => s.add);
  const remove = useFavorites((s) => s.remove);

  const showFavorites = raw.trim().length < 2;
  const tooShort =
    raw.trim().length > 0 && raw.trim().length < 2;

  const sortedResults = useMemo(() => search.data?.results ?? [], [search.data]);

  function selectFavorite(fav: Favorite) {
    setActive({ kind: "favorite", favorite: fav });
    router.back();
  }
  function selectGps() {
    setActive({ kind: "gps" });
    router.back();
  }
  function selectResult(result: SearchResult) {
    const fav = add({
      name: result.name,
      lat: result.lat,
      lon: result.lon,
      ...(result.displayName ? { displayName: result.displayName } : {}),
      ...(result.countryCode ? { countryCode: result.countryCode } : {}),
    });
    selectFavorite(fav);
  }

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
            {t("common.close")}
          </Text>
        </Pressable>
        <Text className="text-base font-semibold text-ink dark:text-ink-inverse">
          {t("location.title")}
        </Text>
        <View style={{ width: 64 }} />
      </View>

      <View className="px-4">
        <TextInput
          placeholder={t("location.searchPlaceholder")}
          placeholderTextColor="#94a3b8"
          autoFocus
          autoCapitalize="words"
          autoCorrect={false}
          returnKeyType="search"
          value={raw}
          onChangeText={setRaw}
          className="rounded-2xl bg-surface px-4 py-3 text-base text-ink dark:bg-surface-darkAlt dark:text-ink-inverse"
        />
      </View>

      <ScrollView contentContainerClassName="p-4 gap-3">
        {showFavorites ? (
          <>
            <Pressable
              onPress={selectGps}
              className="rounded-2xl bg-surface p-4 dark:bg-surface-darkAlt"
              accessibilityRole="button"
            >
              <View className="flex-row items-center justify-between">
                <Text className="text-base text-ink dark:text-ink-inverse">
                  {t("location.gps")}
                </Text>
                {active.kind === "gps" ? (
                  <Text className="text-xs text-sky-600">●</Text>
                ) : null}
              </View>
            </Pressable>

            {items.length > 0 ? (
              <>
                <Text className="mt-2 text-xs uppercase tracking-wider text-ink-muted">
                  {t("location.favorites")}
                </Text>
                {items.map((fav) => (
                  <FavoriteRow
                    key={fav.id}
                    favorite={fav}
                    selected={
                      active.kind === "favorite" && active.favorite.id === fav.id
                    }
                    onSelect={() => selectFavorite(fav)}
                    onRemove={() => remove(fav.id)}
                    removeLabel={t("location.remove")}
                  />
                ))}
              </>
            ) : null}
          </>
        ) : tooShort ? (
          <Text className="text-sm text-ink-muted">
            {t("location.minQuery")}
          </Text>
        ) : search.isLoading ? (
          <View className="items-center py-8">
            <ActivityIndicator />
          </View>
        ) : search.isError ? (
          <Text className="text-sm text-ink-muted">
            {t("errors.searchUnavailable")}
          </Text>
        ) : sortedResults.length === 0 ? (
          <Text className="text-sm text-ink-muted">
            {t("location.noResults")}
          </Text>
        ) : (
          sortedResults.map((result, idx) => (
            <Pressable
              key={`${result.lat}#${result.lon}#${idx}`}
              onPress={() => selectResult(result)}
              className="rounded-2xl bg-surface p-4 dark:bg-surface-darkAlt"
              accessibilityRole="button"
            >
              <Text className="text-base font-medium text-ink dark:text-ink-inverse">
                {result.name}
              </Text>
              <Text className="mt-1 text-xs text-ink-muted" numberOfLines={2}>
                {result.displayName}
              </Text>
            </Pressable>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function FavoriteRow({
  favorite,
  selected,
  onSelect,
  onRemove,
  removeLabel,
}: {
  favorite: Favorite;
  selected: boolean;
  onSelect: () => void;
  onRemove: () => void;
  removeLabel: string;
}) {
  return (
    <View className="flex-row items-center gap-2">
      <Pressable
        onPress={onSelect}
        className="flex-1 rounded-2xl bg-surface p-4 dark:bg-surface-darkAlt"
        accessibilityRole="button"
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-1 pr-2">
            <Text className="text-base text-ink dark:text-ink-inverse">
              {favorite.name}
            </Text>
            {favorite.displayName ? (
              <Text className="mt-1 text-xs text-ink-muted" numberOfLines={1}>
                {favorite.displayName}
              </Text>
            ) : null}
          </View>
          {selected ? (
            <Text className="text-xs text-sky-600">●</Text>
          ) : null}
        </View>
      </Pressable>
      <Pressable
        onPress={onRemove}
        className="rounded-full bg-surface px-3 py-2 dark:bg-surface-darkAlt"
        accessibilityRole="button"
        accessibilityLabel={removeLabel}
      >
        <Text className="text-xs text-ink-muted">×</Text>
      </Pressable>
    </View>
  );
}
