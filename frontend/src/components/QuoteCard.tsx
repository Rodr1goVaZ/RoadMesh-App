import React, { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { api } from "../api";
import { colors, radius, spacing, shadows } from "../theme";
import { formatDate, formatEUR, QUOTE_STATUS_LABELS } from "../utils/format";
import { shareQuote } from "../utils/documents";
import { Button } from "./Button";
import { Feedback } from "./Feedback";

export function QuoteCard({ quote }: { quote: any }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const send = async (channel: "email" | "whatsapp") => {
    setBusy(channel); setError(""); setMessage("");
    try { await shareQuote(quote, channel); setMessage("Conclua o envio na aplicação. Depois, confirme abaixo se o orçamento foi enviado."); }
    catch (e: any) { setError(e.message); }
    finally { setBusy(""); }
  };
  const changeStatus = async (status: string) => {
    setBusy(status); setError("");
    try { await api.post(`/quotes/${quote.id}/status`, { status }); await qc.invalidateQueries({ queryKey: ["quotes"] }); setMessage(`Orçamento marcado como ${QUOTE_STATUS_LABELS[status].toLowerCase()}.`); }
    catch (e: any) { setError(e.message); }
    finally { setBusy(""); }
  };
  const convert = async () => {
    setBusy("convert"); setError("");
    try {
      const order = await api.post(`/quotes/${quote.id}/convert`, {});
      qc.invalidateQueries({ queryKey: ["work-orders"] }); qc.invalidateQueries({ queryKey: ["dashboard"] });
      setConfirm(false); router.push(`/(app)/servico/${order.id}`);
    } catch (e: any) { setError(e.message); }
    finally { setBusy(""); }
  };
  const id = quote.id;
  return <View testID={`quote-card-${id}`} style={styles.card}>
    <View style={styles.row}>
      <Text testID={`quote-number-${id}`} style={styles.number}>{quote.number}</Text>
      <Text testID={`quote-status-${id}`} style={styles.status}>{QUOTE_STATUS_LABELS[quote.status]}</Text>
    </View>
    <Text testID={`quote-client-${id}`} style={styles.client}>{quote.client_name}</Text>
    <Text testID={`quote-vehicle-${id}`} style={styles.hint}>{quote.vehicle?.license_plate} · {formatDate(quote.created_at)}</Text>
    <Text testID={`quote-total-${id}`} style={styles.total}>{formatEUR(quote.total)}</Text>
    <Button testID={`quote-details-${id}`} title={expanded ? "Ocultar detalhes" : "Ver detalhes do orçamento"} variant="ghost" onPress={() => setExpanded(!expanded)} />
    {expanded && <View testID={`quote-lines-${id}`} style={styles.lines}>{quote.items.map((item: any, index: number) => <Text testID={`quote-line-${id}-${index}`} key={item.id || index} style={styles.hint}>{item.item_type === "peca" ? "Peça" : "Mão de obra"} · {item.description} · {item.quantity} × {formatEUR(item.unit_price)}</Text>)}
      <Text testID={`quote-tax-${id}`} style={styles.hint}>Subtotal {formatEUR(quote.subtotal)} · IVA {formatEUR(quote.vat)}</Text>
    </View>}
    <View style={styles.row}>
      <Button testID={`quote-email-${id}`} title="Email" variant="secondary" style={styles.flex} disabled={!!busy} loading={busy === "email"} onPress={() => send("email")} />
      <Button testID={`quote-whatsapp-${id}`} title="WhatsApp" variant="secondary" style={styles.flex} disabled={!!busy} loading={busy === "whatsapp"} onPress={() => send("whatsapp")} />
    </View>
    <Feedback testID={`quote-error-${id}`} error message={error} />
    {error.includes("contactos") && <Button testID={`quote-edit-client-${id}`} title="Abrir ficha do cliente" variant="ghost" onPress={() => router.push(`/(app)/clientes/${quote.client_id}`)} />}
    <Feedback testID={`quote-feedback-${id}`} message={message} />
    {quote.status === "rascunho" && <Button testID={`quote-mark-sent-${id}`} title="Confirmar que enviei" variant="ghost" disabled={!!busy} loading={busy === "enviado"} onPress={() => changeStatus("enviado")} />}
    {quote.status === "enviado" && <View style={styles.row}>
      <Button testID={`quote-accept-${id}`} title="Aceite" style={styles.flex} disabled={!!busy} loading={busy === "aceite"} onPress={() => changeStatus("aceite")} />
      <Button testID={`quote-reject-${id}`} title="Recusado" variant="secondary" style={styles.flex} disabled={!!busy} onPress={() => changeStatus("recusado")} />
    </View>}
    {quote.status === "aceite" && (confirm ? <>
      <Text testID={`quote-convert-confirmation-${id}`} style={styles.hint}>Criar uma ordem de serviço a partir deste orçamento?</Text>
      <Button testID={`quote-convert-confirm-${id}`} title="Criar OS" disabled={!!busy} loading={busy === "convert"} onPress={convert} />
      <Button testID={`quote-convert-cancel-${id}`} title="Cancelar" variant="ghost" disabled={!!busy} onPress={() => setConfirm(false)} />
    </> : <Button testID={`quote-convert-${id}`} title="Converter em OS" disabled={!!busy} onPress={() => setConfirm(true)} />)}
  </View>;
}
const styles = StyleSheet.create({
  card: { padding: spacing.lg, gap: 10, backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, ...shadows.card },
  row: { flexDirection: "row", gap: 10, alignItems: "center", justifyContent: "space-between" }, flex: { flex: 1 },
  number: { color: colors.onSurface, fontWeight: "800", fontSize: 16, flexShrink: 1 },
  status: { fontSize: 12, fontWeight: "700", color: colors.brandPrimary },
  client: { color: colors.onSurface, fontSize: 16, fontWeight: "600" },
  hint: { color: colors.muted, fontSize: 13, lineHeight: 20 },
  total: { fontSize: 22, fontWeight: "800", color: colors.brandPrimary },
  lines: { gap: 8, padding: 12, backgroundColor: colors.surface, borderRadius: radius.md },
});