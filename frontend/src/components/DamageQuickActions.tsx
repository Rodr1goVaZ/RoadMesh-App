import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { colors, radius, spacing, shadows } from "../theme";

export const DAMAGE_TYPES = [
  { id: "risco", label: "Risco", icon: "pencil-outline" },
  { id: "amolgadela", label: "Amolgadela", icon: "car-outline" },
  { id: "fuga", label: "Fuga", icon: "water-outline" },
] as const;
export function DamageQuickActions({ vehicleId, testID }: { vehicleId?: string; testID: string }) {
  return <View style={styles.card}>
    <Text testID={`${testID}-heading`} style={styles.title}>Registo rápido de danos</Text>
    <Text testID={`${testID}-help`} style={styles.hint}>Assinale o dano, adicione uma foto e a gravidade.</Text>
    <View style={styles.row}>{DAMAGE_TYPES.map(type => <Pressable key={type.id} testID={`${testID}-${type.id}`}
      onPress={() => router.push({ pathname: "/(app)/danos", params: { ...(vehicleId ? { vehicle_id: vehicleId } : {}), category: type.id } })}
      style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
      <Ionicons name={type.icon} size={23} color={colors.brandPrimary} />
      <Text style={styles.label}>{type.label}</Text>
    </Pressable>)}</View>
  </View>;
}
const styles = StyleSheet.create({
  card: { backgroundColor: colors.surfaceSecondary, padding: spacing.lg, borderRadius: radius.lg, gap: 10, ...shadows.card },
  title: { color: colors.onSurface, fontSize: 17, fontWeight: "700" },
  hint: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  row: { flexDirection: "row", gap: 8 },
  action: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.brandTertiary, borderRadius: radius.md, minHeight: 78, padding: 8, gap: 8 },
  label: { color: colors.brandPrimary, fontWeight: "600", fontSize: 12 },
  pressed: { opacity: .7 },
});