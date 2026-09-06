// RoadMesh theme tokens - filled from design_guidelines.json
import { useMemo } from "react";
import { Appearance, StyleSheet, useColorScheme } from "react-native";

export type ColorScheme = "light" | "dark";

const light = {
  // Surfaces
  surface: "#EEF3FA",
  onSurface: "#111827",
  surfaceSecondary: "#FFFFFF",
  onSurfaceSecondary: "#111827",
  surfaceTertiary: "#F3F4F6",
  onSurfaceTertiary: "#374151",
  surfaceInverse: "#1F2937",
  onSurfaceInverse: "#FFFFFF",
  muted: "#6B7280",

  // Brand
  brand: "#7A1E2B",
  onBrand: "#FFFFFF",
  brandPrimary: "#7A1E2B",
  onBrandPrimary: "#FFFFFF",
  brandSecondary: "#1E293B",
  onBrandSecondary: "#FFFFFF",
  brandTertiary: "#FCEAEA",
  onBrandTertiary: "#7A1E2B",

  // Status
  success: "#10B981",
  onSuccess: "#FFFFFF",
  warning: "#F59E0B",
  onWarning: "#FFFFFF",
  error: "#EF4444",
  onError: "#FFFFFF",
  info: "#38BDF8",
  onInfo: "#FFFFFF",

  // Lines
  border: "#E5E7EB",
  borderStrong: "#D1D5DB",
  divider: "#E5E7EB",
};

export type ThemeColors = typeof light;

export const defaultScheme = "light" satisfies ColorScheme;
export const themes: { light: ThemeColors; dark?: ThemeColors } = { light };

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, "2xl": 32, "3xl": 48 };
export const radius = { sm: 6, md: 8, lg: 12, xl: 16, pill: 999 };
export const shadows = {
  card: {
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
};

export function setColorScheme(scheme: ColorScheme | null) {
  Appearance.setColorScheme?.(scheme);
}
setColorScheme?.(themes.dark ? null : defaultScheme);

export function useTheme(): { scheme: ColorScheme; colors: ThemeColors } {
  const system = useColorScheme();
  const scheme: ColorScheme = system && themes[system] ? system : defaultScheme;
  return { scheme, colors: themes[scheme] ?? themes.light };
}

export const colors = light;

export function makeStyles<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(
  factory: (c: ThemeColors) => T & StyleSheet.NamedStyles<any>,
): () => T {
  return function useStyles(): T {
    const { colors } = useTheme();
    return useMemo(() => StyleSheet.create(factory(colors)), [colors]);
  };
}
