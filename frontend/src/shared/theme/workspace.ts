import { createContext } from "react";
import { StyleSheet } from "react-native";
export const WorkspaceVisualContext = createContext(false);
export const workspaceColors = { background: "#F8F9FD", card: "#FFFFFF", ink: "#171A20", muted: "#686B74", brand: "#650D0D", soft: "#F4F5FB", line: "#ECEEF5", warm: "#FCEEEE" };
export const workspaceStyles = StyleSheet.create({
  card: { backgroundColor: workspaceColors.card, borderRadius: 24, padding: 22, gap: 14, borderWidth: 1, borderColor: "#F4F4F8", shadowColor: "#20243A", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.045, shadowRadius: 12, elevation: 2 },
  title: { fontSize: 18, fontWeight: "700", color: workspaceColors.ink },
  hint: { fontSize: 14, lineHeight: 21, color: workspaceColors.muted },
});
