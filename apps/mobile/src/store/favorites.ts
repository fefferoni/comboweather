import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export interface Favorite {
  /** Stable client-generated id (lat#lon, rounded). */
  id: string;
  name: string;
  /** Optional longer label (Nominatim display_name); falls back to `name`. */
  displayName?: string;
  lat: number;
  lon: number;
  countryCode?: string;
}

/** Active location selected for forecast display: GPS or a saved favorite. */
export type ActiveLocation =
  | { kind: "gps" }
  | { kind: "favorite"; favorite: Favorite };

export interface FavoritesState {
  items: Favorite[];
  active: ActiveLocation;
  add: (favorite: Omit<Favorite, "id"> & { id?: string }) => Favorite;
  remove: (id: string) => void;
  setActive: (location: ActiveLocation) => void;
}

function favoriteId(lat: number, lon: number): string {
  return `${lat.toFixed(2)}#${lon.toFixed(2)}`;
}

export const useFavorites = create<FavoritesState>()(
  persist(
    (set, get) => ({
      items: [],
      active: { kind: "gps" },
      add: (input) => {
        const id = input.id ?? favoriteId(input.lat, input.lon);
        const next: Favorite = {
          id,
          name: input.name,
          lat: input.lat,
          lon: input.lon,
          ...(input.displayName ? { displayName: input.displayName } : {}),
          ...(input.countryCode ? { countryCode: input.countryCode } : {}),
        };
        const existing = get().items.findIndex((f) => f.id === id);
        if (existing >= 0) {
          const items = [...get().items];
          items[existing] = next;
          set({ items });
        } else {
          set({ items: [...get().items, next] });
        }
        return next;
      },
      remove: (id) => {
        const items = get().items.filter((f) => f.id !== id);
        const active = get().active;
        const nextActive: ActiveLocation =
          active.kind === "favorite" && active.favorite.id === id
            ? { kind: "gps" }
            : active;
        set({ items, active: nextActive });
      },
      setActive: (location) => set({ active: location }),
    }),
    {
      name: "comboweather:favorites",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ items, active }) => ({ items, active }),
    },
  ),
);

export { favoriteId };
