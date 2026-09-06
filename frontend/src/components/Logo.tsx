import React from "react";
import { Image, View, Text, StyleSheet } from "react-native";
import { colors } from "../theme";
import { API_BASE } from "../api";

export const LOGO_URL = `${API_BASE}/brand/logo.png?v=transparent-1`;

export function Logo({ size = 48, testID = "roadmesh-logo" }: { size?: number; testID?: string }) {
  return <Image testID={testID} accessibilityLabel="Logótipo RoadMesh" source={{ uri: LOGO_URL }}
    style={[styles.logo, { width: size, height: size }]} resizeMode="contain" />;
}

export function LogoWithText({ compact, testID = "roadmesh-brand" }: { compact?: boolean; testID?: string }) {
  return <View style={styles.row}>
    <Logo size={compact ? 36 : 44} testID={`${testID}-logo`} />
    <Text testID={`${testID}-name`} style={[styles.name, compact && styles.compact]}>RoadMesh</Text>
  </View>;
}

const styles = StyleSheet.create({
  logo: { backgroundColor: "transparent" },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  name: { fontWeight: "800", fontSize: 18, color: colors.onSurface, letterSpacing: .2 },
  compact: { fontSize: 15 },
});