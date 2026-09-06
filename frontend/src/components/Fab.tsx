import React from "react";
import { Pressable, Text, StyleSheet } from "react-native";
import { colors, radius, shadows } from "../theme";

export function Fab({ onPress, label = "+", testID }: { onPress: () => void; label?: string; testID?: string }) {
  return (
    <Pressable testID={testID} onPress={onPress} style={({ pressed }) => [styles.fab, pressed && { opacity: 0.8 }]}>
      <Text style={styles.txt}>{label}</Text>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  fab: {
    position: "absolute", right: 20, bottom: 20, width: 56, height: 56, borderRadius: 999,
    backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center",
    ...shadows.card,
  },
  txt: { color: "#fff", fontSize: 30, fontWeight: "700", marginTop: -2 },
});
