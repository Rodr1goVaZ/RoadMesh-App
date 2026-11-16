import { createThemedStyles } from "@/src/shared/theme/ThemeProvider";
import React from "react";
import { Pressable, Text } from "react-native";
import { shadows } from "@/src/shared/theme/legacy";

export function Fab({ onPress, label = "+", testID }: { onPress: () => void; label?: string; testID?: string }) {
  const styles = useStyles();

  return (
    <Pressable testID={testID} onPress={onPress} style={({ pressed }) => [styles.fab, pressed && { opacity: 0.8 }]}>
      <Text style={styles.txt}>{label}</Text>
    </Pressable>
  );
}
const useStyles = createThemedStyles((theme) => { const colors = theme.colors; return ({
  fab: {
    position: "absolute", right: 20, bottom: 20, width: 56, height: 56, borderRadius: 999,
    backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center",
    ...shadows.card,
  },
  txt: { color: theme.tones.onAction, fontSize: 30, fontWeight: "700", marginTop: -2 },
}); });
