export type ColorScheme = "light" | "dark";

const light = {
  background: "#F8F9FD", card: "#FFFFFF", soft: "#F3F4F6", ink: "#111827", secondaryInk: "#374151", muted: "#686B74", placeholder: "#8A9099",
  dangerBorder: "#FF3333", dangerButtonBorder: "#C45252", line: "#E5E7EB", strongLine: "#D1D5DB", accent: "#650D0D", action: "#650D0D", onAction: "#FFFFFF", warm: "#FCEAEA", warmInk: "#7A1E2B",
  inverse: "#1F2937", onInverse: "#FFFFFF", success: "#24754B", successSoft: "#EAF6EF", warning: "#986022", warningSoft: "#FFF3E5",
  error: "#BA2430", errorSoft: "#FFF0F1", errorFill: "#BA2430", info: "#1D4ED8", infoSoft: "#DBEAFE", sky: "#0369A1", skySoft: "#E0F2FE",
  chartPrevious: "#A5ADBD", chartGreen: "#357962", overlay: "rgba(20,24,35,.48)", glass: "rgba(255,255,255,.94)", shadow: "#0F172A",
};
export type ThemeTones = typeof light;
const dark: ThemeTones = {
  background: "#0D0D0D", card: "#141414", soft: "#161616", ink: "#F3F3F3", secondaryInk: "#D8D8D8", muted: "#B8B8B8", placeholder: "#737373",
  dangerBorder: "#FF3333", dangerButtonBorder: "#C45252", line: "#303030", strongLine: "#626262", accent: "#EC3B3B", action: "#A32929", onAction: "#FFFFFF", warm: "#121212", warmInk: "#EC3B3B",
  inverse: "#D8D8D8", onInverse: "#141414", success: "#8AD5AC", successSoft: "#1D392D", warning: "#F3C078", warningSoft: "#3D3020",
  error: "#FFADB6", errorSoft: "#3F252F", errorFill: "#A62D3B", info: "#A9C7FF", infoSoft: "#233553", sky: "#91D4F3", skySoft: "#203A49",
  chartPrevious: "#A0A0A0", chartGreen: "#8AD5AC", overlay: "rgba(0,0,0,.68)", glass: "rgba(20,20,20,.96)", shadow: "#000000",
};
function palette(scheme: ColorScheme, tones: ThemeTones) {
  return { scheme, tones, colors: {
    surface: tones.background, onSurface: tones.ink, surfaceSecondary: tones.card, onSurfaceSecondary: tones.ink,
    surfaceTertiary: tones.soft, onSurfaceTertiary: tones.secondaryInk, surfaceInverse: tones.inverse, onSurfaceInverse: tones.onInverse, muted: tones.muted, placeholder: tones.placeholder,
    brand: tones.accent, brandAccent: tones.accent, onBrand: tones.onAction, brandPrimary: tones.action, onBrandPrimary: tones.onAction,
    brandSecondary: tones.inverse, onBrandSecondary: tones.onInverse, brandTertiary: tones.warm, onBrandTertiary: tones.warmInk,
    success: tones.success, onSuccess: tones.onAction, warning: tones.warning, onWarning: tones.onAction,
    error: tones.error, errorFill: tones.errorFill, onError: tones.onAction, info: tones.info, onInfo: tones.onAction,
    border: tones.line, borderStrong: tones.strongLine, divider: tones.line,
  }, workspace: { background: tones.background, card: tones.card, ink: tones.ink, muted: tones.muted, brand: tones.accent, brandFill: tones.action, soft: tones.soft, line: tones.line, warm: tones.warm } };
}
export const palettes = { light: palette("light", light), dark: palette("dark", dark) };
export type AppPalette = ReturnType<typeof palette>;
export const THEME_STORAGE_KEY = "roadmesh:appearance";
export function parseColorScheme(value: string | null | undefined): ColorScheme { return value === "dark" ? "dark" : "light"; }


