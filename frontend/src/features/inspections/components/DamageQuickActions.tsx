import { useAppTheme, createThemedStyles } from "@/src/shared/theme/ThemeProvider";
import { useAuth } from "@/src/core/auth/AuthProvider";
import { hasFeature } from "@/src/core/auth/company-features";
import React from "react";
import { View, Text, Pressable } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { radius, spacing, shadows } from "@/src/shared/theme/legacy";

export const DAMAGE_TYPES = [
  { id: "risco", label: "Risco", icon: "pencil-outline" },
  { id: "amolgadela", label: "Amolgadela", icon: "car-outline" },
  { id: "fuga", label: "Fuga", icon: "water-outline" },
] as const;
export function DamageQuickActions({ vehicleId, testID }: { vehicleId?: string; testID: string }) {
  const theme = useAppTheme();
  const colors = theme.colors;
  const styles = useStyles();

  const { user, support } = useAuth();
  if (!hasFeature(support || user, "vehicle_reception")) return null;
  return <View style={styles.card}>
    <Text testID={`${testID}-heading`} style={styles.title}>Registo rápido de danos</Text>
    <Text testID={`${testID}-help`} style={styles.hint}>Assinale o dano, adicione uma foto e a gravidade.</Text>
    <View style={styles.row}>{DAMAGE_TYPES.map(type => <Pressable key={type.id} testID={`${testID}-${type.id}`}
      onPress={() => router.push({ pathname: "/(app)/danos", params: { ...(vehicleId ? { vehicle_id: vehicleId } : {}), category: type.id } })}
      style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
      <Ionicons name={type.icon} size={23} color={colors.brandAccent} />
      <Text style={styles.label}>{type.label}</Text>
    </Pressable>)}</View>
  </View>;
}
const useStyles = createThemedStyles((theme) => { const colors = theme.colors; return ({
  card: { backgroundColor: colors.surfaceSecondary, padding: spacing.lg, borderRadius: radius.lg, gap: 10, ...shadows.card },
  title: { color: colors.onSurface, fontSize: 17, fontWeight: "700" },
  hint: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  row: { flexDirection: "row", gap: 8 },
  action: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.brandTertiary, borderRadius: radius.md, minHeight: 78, padding: 8, gap: 8 },
  label: { color: colors.brandAccent, fontWeight: "600", fontSize: 12 },
  pressed: { opacity: .7 },
}); });