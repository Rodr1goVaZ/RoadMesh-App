import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Appearance, Platform, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { palettes, parseColorScheme, THEME_STORAGE_KEY, type AppPalette, type ColorScheme } from "./palettes";

type Theme = AppPalette & { setScheme: (scheme: ColorScheme) => void };
const ThemeContext = createContext<Theme>({ ...palettes.light, setScheme: () => {} });
function initialScheme(): ColorScheme {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    try { return parseColorScheme(window.localStorage.getItem(THEME_STORAGE_KEY)); } catch { /* Storage may be disabled. */ }
  }
  return "light";
}
export function ThemeProvider({ children }: React.PropsWithChildren) {
  const [scheme, setCurrent] = useState<ColorScheme>(initialScheme);
  const changed = useRef(false);
  const writes = useRef(Promise.resolve());
  const setScheme = useCallback((next: ColorScheme) => {
    changed.current = true;
    setCurrent(next);
    // Serialize writes so rapid toggles cannot persist an older selection.
    writes.current = writes.current.catch(() => {}).then(() => AsyncStorage.setItem(THEME_STORAGE_KEY, next)).catch(() => {});
  }, []);
  useEffect(() => {
    let active = true;
    if (Platform.OS !== "web") void AsyncStorage.getItem(THEME_STORAGE_KEY).then(value => { if (active && !changed.current) setCurrent(parseColorScheme(value)); }).catch(() => {});
    const sync = (event: StorageEvent) => { if (event.key === THEME_STORAGE_KEY) setCurrent(parseColorScheme(event.newValue)); };
    if (Platform.OS === "web") window.addEventListener("storage", sync);
    return () => { active = false; if (Platform.OS === "web") window.removeEventListener("storage", sync); };
  }, []);
  useEffect(() => {
    Appearance.setColorScheme?.(scheme);
    if (Platform.OS === "web") {
      const root = document.documentElement;
      root.style.colorScheme = scheme;
      root.style.setProperty("--roadmesh-ink", palettes[scheme].tones.ink);
      root.style.setProperty("--roadmesh-card", palettes[scheme].tones.card);
      root.style.setProperty("--roadmesh-accent", palettes[scheme].tones.accent);
      root.style.backgroundColor = palettes[scheme].tones.background;
      document.body.style.backgroundColor = palettes[scheme].tones.background;
      document.querySelector('meta[name="theme-color"]')?.setAttribute("content", palettes[scheme].tones.background);
    }
  }, [scheme]);
  const value = useMemo(() => ({ ...palettes[scheme], setScheme }), [scheme, setScheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
export function useAppTheme() { return useContext(ThemeContext); }
/** Recompute native/web styles on a theme change without remounting screens or forms. */
export function createThemedStyles<T extends StyleSheet.NamedStyles<T>>(factory: (theme: AppPalette) => T) {
  return function useThemedStyles(): T {
    const theme = useAppTheme();
    return useMemo(() => StyleSheet.create(factory(theme)), [theme]);
  };
}

