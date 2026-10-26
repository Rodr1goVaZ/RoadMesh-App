import { useSyncExternalStore } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { alertStore, AppAlert } from "@/src/shared/utils/alerts";
import { colors, radius, spacing } from "@/src/shared/theme/legacy";

export function AlertHost() {
  const request = useSyncExternalStore(alertStore.subscribe, alertStore.snapshot, alertStore.snapshot);
  if (!request) return null;
  const select = (index: number) => {
    const button = request.buttons[index];
    alertStore.dismiss(request);
    Promise.resolve().then(() => button?.onPress?.()).catch(error => {
      AppAlert.alert("Não foi possível concluir", error instanceof Error ? error.message : "Tente novamente.");
    });
  };
  return <Modal visible transparent animationType="fade" onRequestClose={() => {
    const cancel = request.buttons.findIndex(button => button.style === "cancel");
    if (cancel >= 0) select(cancel);
  }}>
    <View style={styles.backdrop}>
      <View accessibilityViewIsModal accessibilityRole="alert" style={styles.panel} testID="app-alert">
        <Text style={styles.title}>{request.title}</Text>
        {!!request.message && <Text style={styles.message}>{request.message}</Text>}
        <View style={styles.actions}>{request.buttons.map((button, index) => <Pressable
          key={`${button.text}-${index}`} accessibilityRole="button" testID={`app-alert-action-${index}`}
          onPress={() => select(index)} style={[styles.button, button.style !== "cancel" && styles.primary, button.style === "destructive" && styles.danger]}>
          <Text style={[styles.buttonText, button.style !== "cancel" && styles.primaryText]}>{button.text || "OK"}</Text>
        </Pressable>)}</View>
      </View>
    </View>
  </Modal>;
}
const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center", padding: spacing.lg },
  panel: { width: "100%", maxWidth: 440, borderRadius: radius.lg, backgroundColor: colors.surfaceSecondary, padding: spacing.lg, gap: spacing.md },
  title: { fontSize: 20, fontWeight: "700", color: colors.onSurface },
  message: { fontSize: 15, lineHeight: 22, color: colors.muted },
  actions: { flexDirection: "row", gap: spacing.md, justifyContent: "flex-end", flexWrap: "wrap" },
  button: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: radius.md, backgroundColor: colors.surface },
  primary: { backgroundColor: colors.brandPrimary }, danger: { backgroundColor: colors.error },
  buttonText: { color: colors.onSurface, fontWeight: "700" }, primaryText: { color: "white" },
});
