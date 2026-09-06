import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { colors, radius, spacing } from "../theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";

export function ScreenHeader({ title, back, right, testID }: { title: string; back?: boolean; right?: React.ReactNode; testID?: string }) {
  const insets = useSafeAreaInsets();
  return (
    <View testID={testID} style={[styles.wrap, { paddingTop: insets.top + 8 }]}>
      <View style={styles.row}>
        {back ? (
          <Pressable testID="back-btn" onPress={() => router.back()} hitSlop={12} style={styles.back}>
            <Text style={styles.backTxt}>‹</Text>
          </Pressable>
        ) : <View style={{ width: 32 }} />}
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        <View style={{ minWidth: 32, alignItems: "flex-end" }}>{right}</View>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  wrap: { backgroundColor: colors.surface, paddingHorizontal: spacing.lg, paddingBottom: 8 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  title: { flex: 1, textAlign: "center", fontSize: 17, fontWeight: "700", color: colors.onSurface },
  back: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  backTxt: { fontSize: 34, color: colors.onSurface, lineHeight: 36, marginTop: -8 },
});
