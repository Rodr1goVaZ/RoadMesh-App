import { createContext } from "react";
import { createThemedStyles } from "./ThemeProvider";
export const WorkspaceVisualContext = createContext(false);
export const AdminPageContext = createContext(false);
export const adminContentWidth = 1500;
export const useWorkspaceStyles = createThemedStyles(({ workspace: c, tones }) => ({
  card: { backgroundColor: c.card, borderRadius: 24, padding: 22, gap: 14, borderWidth: 1, borderColor: c.line, shadowColor: tones.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: .045, shadowRadius: 12, elevation: 2 },
  title: { fontSize: 18, fontWeight: "700", color: c.ink },
  hint: { fontSize: 14, lineHeight: 21, color: c.muted },
}));
