import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { colors, spacing } from "../theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { goBack } from "../utils/navigation";

export function ScreenHeader({ back, right, testID }: { title: string; back?: boolean; right?: React.ReactNode; testID?: string }) {
  const insets = useSafeAreaInsets();
  return (
    <View testID={testID} style={[styles.wrap, { paddingTop: insets.top + 8 }]}>
      <View style={styles.row}>
        {back ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Voltar" testID="back-btn" onPress={goBack} hitSlop={12} style={styles.back}>
            <Text style={styles.backTxt}>‹</Text>
          </Pressable>
        ) : <View style={{ width: 32 }} />}
        <View style={styles.spacer} />
        <View style={{ minWidth: 32, alignItems: "flex-end" }}>{right}</View>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  wrap: { backgroundColor: colors.surface, paddingHorizontal: spacing.lg, paddingBottom: 8 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  spacer: { flex: 1 },
  back: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  backTxt: { fontSize: 34, color: colors.onSurface, lineHeight: 36, marginTop: -8 },
});
