import React, { useState } from "react";
import { Text } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/src/api";
import { useAuth } from "@/src/auth";
import { AreaPage, Panel, Metrics, QueryState, areaStyles } from "@/src/components/AreaUI";
import { Input } from "@/src/components/Input";
import { Button } from "@/src/components/Button";
import { Feedback } from "@/src/components/Feedback";
import { formatEUR, formatDateTime } from "@/src/utils/format";

const kinds: Record<string, string> = { charge: "Documento emitido", payment: "Pagamento", payment_reversal: "Estorno de pagamento", credit: "Crédito interno" };
export default function Finance() {
  const { invoiceId } = useLocalSearchParams<{ invoiceId?: string }>(); const { user, support } = useAuth();
  const manager = !!user?.can_manage_workshop || !!support; const qc = useQueryClient();
  const [selected, setSelected] = useState(invoiceId || ""); const [search, setSearch] = useState("");
  const [kind, setKind] = useState("payment"); const [amount, setAmount] = useState(""); const [reason, setReason] = useState("");
  const [method, setMethod] = useState("transfer"); const [reverses, setReverses] = useState("");
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  // Keep a key through network failures; any edit makes this a new intention.
  const [key, setKey] = useState(() => newKey());
  const summary = useQuery({ queryKey: ["finance-summary"], queryFn: () => api.get("/finance/summary"), enabled: manager });
  const invoices = useQuery({ queryKey: ["invoices"], queryFn: () => api.get("/invoices"), enabled: manager });
  const balance = useQuery({ queryKey: ["invoice-balance", selected], queryFn: () => api.get(`/invoices/${selected}/balance`), enabled: manager && !!selected });
  const refresh = async () => { await Promise.all([qc.invalidateQueries({ queryKey: ["invoice-balance"] }), qc.invalidateQueries({ queryKey: ["finance-summary"] })]); };
  const save = async (reconcile = false) => {
    setError(""); setBusy(true);
    try {
      if (reconcile) await api.post(`/invoices/${selected}/reconcile`, {});
      else await api.post(`/invoices/${selected}/movements`, { kind, amount: amount.replace(",", "."), reason, method, idempotency_key: key, reverses_id: kind === "payment_reversal" ? reverses : null });
      await refresh(); setAmount(""); setReason(""); setKey(newKey());
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };
  return <AreaPage title="Contas e pagamentos" testID="finance">
    {!manager ? <Text style={areaStyles.hint}>Área reservada ao responsável da oficina.</Text> : <>
      <QueryState loading={summary.isLoading} error={summary.error} retry={summary.refetch} testID="finance-summary" />
      {summary.data && <Metrics testID="finance-metrics" entries={[
        { label: "Documentos registados", value: formatEUR(summary.data.invoiced) }, { label: "Recebido líquido", value: formatEUR(summary.data.available) },
        { label: "Por receber", value: formatEUR(summary.data.pending) }, { label: "A devolver", value: formatEUR(summary.data.refund_due) }]} />}
      <Text style={areaStyles.hint}>Os totais incluem movimentos registados e documentos antigos reconciliados. Emitir uma fatura não confirma pagamento. Estes registos são internos e não representam um saldo bancário nem substituem documentos fiscais.</Text>
      <Input label="Procurar documento ou cliente" value={search} onChangeText={setSearch} />
      <QueryState error={invoices.error} retry={invoices.refetch} testID="finance-invoices" />
      {(invoices.data || []).filter((i: any) => i.document_type !== "orcamento" && `${i.document_number} ${i.client_name}`.toLowerCase().includes(search.toLowerCase())).map((i: any) =>
        <Button key={i.id} variant={selected === i.id ? "primary" : "secondary"} title={`${i.document_number} · ${i.client_name || "Cliente"} · ${formatEUR(i.grand_total)}`} onPress={() => { setSelected(i.id); setError(""); setKey(newKey()); }} />)}
      <QueryState loading={balance.isLoading} error={balance.error} retry={balance.refetch} testID="balance" />
      {selected && balance.data && <Panel title="Movimentos da ordem de serviço" testID="invoice-balance">
        <Text style={areaStyles.label}>Por receber: {formatEUR(balance.data.pending)} · Recebido líquido: {formatEUR(balance.data.available)}</Text>
        {!balance.data.reconciled ? <><Text style={areaStyles.hint}>Documento antigo sem histórico de pagamento. Confirme o valor e registe-o como pendente antes de lançar pagamentos efetivamente recebidos.</Text>
          <Button title="Confirmar valor como pendente" loading={busy} onPress={() => save(true)} /></> : <>
          {Object.entries(kinds).filter(([k]) => k !== "charge").map(([k, label]) => <Button key={k} title={label} variant={kind === k ? "primary" : "secondary"} onPress={() => { setKind(k); setKey(newKey()); }} />)}
          {kind === "payment_reversal" && balance.data.movements.filter((m: any) => m.kind === "payment").map((m: any) =>
            <Button key={m.id} title={`${formatDateTime(m.created_at)} · ${formatEUR(m.amount)}`} variant={reverses === m.id ? "primary" : "secondary"} onPress={() => { setReverses(m.id); setKey(newKey()); }} />)}
          <Input label="Valor (€)" keyboardType="decimal-pad" value={amount} onChangeText={v => { setAmount(v); setKey(newKey()); }} />
          <Input label="Motivo / referência" value={reason} onChangeText={v => { setReason(v); setKey(newKey()); }} />
          {kind === "payment" && Object.entries({ transfer: "Transferência", cash: "Numerário", card: "Cartão", other: "Outro" }).map(([m, label]) =>
            <Button key={m} title={label} variant={method === m ? "primary" : "secondary"} onPress={() => { setMethod(m); setKey(newKey()); }} />)}
          <Button title="Registar movimento" onPress={() => save()} loading={busy} disabled={!amount || reason.trim().length < 3 || (kind === "payment_reversal" && !reverses)} />
        </>}
        <Feedback testID="operation-error" error message={error} />
        {balance.data.movements.map((m: any) => <Text key={m.id} selectable style={areaStyles.hint}>{formatDateTime(m.created_at)} · {kinds[m.kind]} · {formatEUR(m.amount)}{"\n"}{m.reason} · {m.actor_name || "Utilizador do registo antigo"}</Text>)}
      </Panel>}
    </>}
  </AreaPage>;
}
function newKey() { return `movement-${Date.now()}-${Math.random().toString(36).slice(2)}`; }
