import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { colors, radius } from "../theme";

export function Logo({ size = 40 }: { size?: number }) {
  const w = size * 0.9;
  return (
    <View style={{ width: w, height: size, justifyContent: "center", alignItems: "center" }}>
      <View style={[styles.badge, { width: w, height: size, borderRadius: radius.md }]}>
        <Text style={[styles.r, { fontSize: size * 0.6 }]}>R</Text>
        <View style={[styles.dot, { top: size * 0.15, right: size * 0.15 }]} />
        <View style={[styles.dot, { bottom: size * 0.15, right: size * 0.28 }]} />
      </View>
    </View>
  );
}
export function LogoWithText({ compact }: { compact?: boolean }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <Logo size={compact ? 28 : 34} />
      <Text style={{ fontWeight: "800", fontSize: compact ? 15 : 18, color: colors.onSurface, letterSpacing: 0.2 }}>
        RoadMesh
      </Text>
    </View>
  );
}
const styles = StyleSheet.create({
  badge: {
    backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center", position: "relative",
  },
  r: { color: "#fff", fontWeight: "900", letterSpacing: -1 },
  dot: { position: "absolute", width: 5, height: 5, borderRadius: 999, backgroundColor: "#fff", opacity: 0.9 },
});
