import { useAppTheme, createThemedStyles } from "@/src/shared/theme/ThemeProvider";
import React from "react";
import { View, Text, ViewStyle } from "react-native";
import { radius, spacing } from "@/src/shared/theme/legacy";


export function StatusChip({ status, style }: { status: string; style?: ViewStyle }) {
  const theme = useAppTheme();
  const colors = theme.colors;
  const styles = useStyles();
const map: Record<string, { bg: string; fg: string; label: string }> = {
  entrada:            { bg: theme.tones.infoSoft, fg: theme.tones.info, label: "Entrada" },
  diagnostico:        { bg: theme.tones.warningSoft, fg: theme.tones.warning, label: "Diagnóstico" },
  aguardando_pecas:   { bg: theme.tones.soft, fg: theme.tones.secondaryInk, label: "Aguarda peças" },
  concluido:          { bg: theme.tones.successSoft, fg: theme.tones.success, label: "Concluído" },
  reparacao:          { bg: theme.tones.warningSoft, fg: theme.tones.warning, label: "Em reparação" },
  orcamento:          { bg: theme.tones.skySoft, fg: theme.tones.sky, label: "Orçamento" },
  aguarda:            { bg: theme.tones.soft, fg: theme.tones.secondaryInk, label: "Aguarda cliente" },
};


  const s = map[status] || { bg: colors.surfaceTertiary, fg: colors.onSurfaceTertiary, label: status };
  return (
    <View testID={`status-chip-${status}`} style={[styles.chip, { backgroundColor: s.bg }, style]}>
      <Text style={[styles.text, { color: s.fg }]}>{s.label}</Text>
    </View>
  );
}
const useStyles = createThemedStyles((theme) => {  return ({
  chip: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.pill, alignSelf: "flex-start" },
  text: { fontSize: 12, fontWeight: "600" },
}); });
