import React from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";
import { colors, radius, spacing } from "../theme";

type Variant = "reparacao" | "orcamento" | "concluido" | "aguarda" | "entrada" | "diagnostico" | "aguardando_pecas";

const map: Record<string, { bg: string; fg: string; label: string }> = {
  entrada:            { bg: "#DBEAFE", fg: "#1D4ED8", label: "Entrada" },
  diagnostico:        { bg: "#FEF3C7", fg: "#B45309", label: "Diagnóstico" },
  aguardando_pecas:   { bg: "#E5E7EB", fg: "#374151", label: "Aguarda peças" },
  concluido:          { bg: "#DCFCE7", fg: "#15803D", label: "Concluído" },
  reparacao:          { bg: "#FEF3C7", fg: "#B45309", label: "Em reparação" },
  orcamento:          { bg: "#E0F2FE", fg: "#0369A1", label: "Orçamento" },
  aguarda:            { bg: "#E5E7EB", fg: "#374151", label: "Aguarda cliente" },
};

export function StatusChip({ status, style }: { status: string; style?: ViewStyle }) {
  const s = map[status] || { bg: colors.surfaceTertiary, fg: colors.onSurfaceTertiary, label: status };
  return (
    <View testID={`status-chip-${status}`} style={[styles.chip, { backgroundColor: s.bg }, style]}>
      <Text style={[styles.text, { color: s.fg }]}>{s.label}</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  chip: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.pill, alignSelf: "flex-start" },
  text: { fontSize: 12, fontWeight: "600" },
});
