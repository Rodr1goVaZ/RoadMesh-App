import { createThemedStyles } from "@/src/shared/theme/ThemeProvider";
import React from "react";
import { View, Text, Pressable } from "react-native";
import { spacing } from "@/src/shared/theme/legacy";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { goBack } from "@/src/shared/utils/navigation";

export function ScreenHeader({ back, right, testID }: { title: string; back?: boolean; right?: React.ReactNode; testID?: string }) {
  const styles = useStyles();

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
const useStyles = createThemedStyles((theme) => { const colors = theme.colors; return ({
  wrap: { backgroundColor: colors.surface, paddingHorizontal: spacing.lg, paddingBottom: 8 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  spacer: { flex: 1 },
  back: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  backTxt: { fontSize: 34, color: colors.onSurface, lineHeight: 36, marginTop: -8 },
}); });
