import { useMemo } from "react";
import { StyleSheet } from "react-native";
import { useAppTheme } from "./ThemeProvider";
import { palettes } from "./palettes";
export type { ColorScheme } from "./palettes";
export type ThemeColors = typeof palettes.light.colors;
export const defaultScheme = "light";
export const themes = { light: palettes.light.colors, dark: palettes.dark.colors };
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, "2xl": 32, "3xl": 48 };
export const radius = { sm: 6, md: 14, lg: 24, xl: 28, pill: 999 };
export const shadows = {
  card: {
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
};


export function useTheme() { const { scheme, colors } = useAppTheme(); return { scheme, colors }; }
export function makeStyles<T extends StyleSheet.NamedStyles<T>>(factory: (colors: ThemeColors) => T): () => T {
  return function useStyles(): T {
    const { colors } = useTheme();
    return useMemo(() => StyleSheet.create(factory(colors)), [colors]);
  };
}
