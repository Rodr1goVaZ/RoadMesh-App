import React, { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, radius, spacing, shadows } from "../theme";
import { formatDate, formatEUR } from "../utils/format";
import { exportInvoice } from "../utils/documents";
import { Button } from "./Button";
import { Feedback } from "./Feedback";

const TYPES: Record<string, string> = { fatura: "Fatura", fatura_recibo: "Fatura-recibo", orcamento: "Orçamento" };
export function InvoiceCard({ invoice }: { invoice: any }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const exportPdf = async () => {
    setLoading(true); setError("");
    try { await exportInvoice(invoice); }
    catch (e: any) { setError(e.message || "Não foi possível exportar o PDF."); }
    finally { setLoading(false); }
  };
  const id = invoice.id;
  return <View testID={`invoice-card-${id}`} style={styles.card}>
    <Text testID={`invoice-number-${id}`} style={styles.number}>{invoice.document_number}</Text>
    <Text testID={`invoice-type-${id}`} style={styles.type}>{TYPES[invoice.document_type]} · Documento interno</Text>
    <Text testID={`invoice-client-${id}`} style={styles.client}>{invoice.client_name || "Cliente"}</Text>
    <Text testID={`invoice-date-${id}`} style={styles.hint}>{formatDate(invoice.created_at)} · OS {invoice.wo_number || "—"}</Text>
    <View style={styles.row}>
      <Text testID={`invoice-parts-${id}`} style={styles.hint}>Peças (s/ IVA): {formatEUR(invoice.total_parts)}</Text>
      <Text testID={`invoice-labor-${id}`} style={styles.hint}>Mão de obra (s/ IVA): {formatEUR(invoice.total_labor)}</Text>
    </View>
    <Text testID={`invoice-vat-${id}`} style={styles.hint}>IVA: {formatEUR(invoice.vat)}</Text>
    <Text testID={`invoice-total-${id}`} style={styles.total}>Total {formatEUR(invoice.grand_total)}</Text>
    <Feedback testID={`invoice-export-error-${id}`} error message={error} />
    <Button testID={`invoice-export-pdf-${id}`} title="Exportar PDF" onPress={exportPdf} loading={loading} />
  </View>;
}
const styles = StyleSheet.create({
  card: { padding: spacing.lg, gap: 10, backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, ...shadows.card },
  number: { color: colors.onSurface, fontSize: 18, fontWeight: "800" },
  type: { color: colors.brandPrimary, fontSize: 12, fontWeight: "700" },
  client: { color: colors.onSurface, fontSize: 16, fontWeight: "600" },
  hint: { color: colors.muted, fontSize: 13, lineHeight: 20 },
  row: { gap: 4, marginTop: 6 },
  total: { color: colors.brandPrimary, fontSize: 22, fontWeight: "800", marginVertical: 6 },
});