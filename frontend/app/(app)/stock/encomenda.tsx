import { normalizeIdentifier as normalize } from "@/src/shared/utils/validation";
import { AppAlert } from "@/src/shared/utils/alerts";
import { BarcodeCamera } from "@/src/shared/media/BarcodeCamera";
import React, { useState } from "react";
import { Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/src/core/http/api";
import { useAuth } from "@/src/core/auth/AuthProvider";
import { AreaPage, Panel, QueryState, areaStyles } from "@/src/shared/layout/AreaUI";
import { Input } from "@/src/shared/ui/Input";
import { Button } from "@/src/shared/ui/Button";
import { Feedback } from "@/src/shared/ui/Feedback";
import { formatEUR, formatDateTime } from "@/src/shared/utils/format";

export default function OrderDetail() {
  const { id } = useLocalSearchParams<{ id: string }>(); const { user, support } = useAuth();
  const manager = !!user?.can_manage_workshop || !!support; const qc = useQueryClient();
  const query = useQuery({ queryKey: ["purchase-order", id], queryFn: () => api.get(`/purchase-orders/${id}`), enabled: !!id });
  const [editedItems, setItems] = useState<any[] | null>(null); const items: any[] = editedItems ?? query.data?.items ?? []; const [barcode, setBarcode] = useState(""); const [quantity, setQuantity] = useState("1");
  const [key, setKey] = useState(() => newKey()); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const lookup = useQuery({ queryKey: ["barcode-product", barcode.trim()], queryFn: () => api.get("/products?barcode=" + encodeURIComponent(barcode.trim())), enabled: !!barcode.trim() });
  const identified = lookup.data?.find((p: any) => normalize(p.barcode) === normalize(barcode));
  const run = async (action: string) => {
    setBusy(true); setError("");
    try {
      if (action === "draft") await api.put(`/purchase-orders/${id}/draft`, { items: items.map(i => ({ product_id: i.product_id, quantity: Number(i.quantity) })) });
      if (action === "cancel") await api.post(`/purchase-orders/${id}/cancel`, {});
      if (action === "validate") await api.post(`/purchase-orders/${id}/validate`, {});
      if (action === "receive") {
        const products = await api.get("/products?barcode=" + encodeURIComponent(barcode.trim()));
        const product = products.find((p: any) => normalize(p.barcode) === normalize(barcode));
        if (!product || !items.some(i => i.product_id === product.id)) throw new Error("O código não corresponde a um produto desta encomenda.");
        await api.post(`/purchase-orders/${id}/receive`, { idempotency_key: key, items: [{ product_id: product.id, quantity: quantity.replace(",", "."), barcode: barcode.trim() }] });
        setBarcode(""); setQuantity("1"); setKey(newKey());
      }
      setItems(null);
      await Promise.all(["purchase-order", "purchase-orders", "products", "product"].map(k => qc.invalidateQueries({ queryKey: [k] })));
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };
  const draft = ["rascunho", "por_validar"].includes(query.data?.status);
  return <AreaPage title="Encomenda" testID="order-detail"><QueryState loading={query.isLoading} error={query.error} retry={query.refetch} testID="order-query" />
    {query.data && <><Panel title={query.data.supplier} testID="order-lines">
      <Text style={areaStyles.label}>{labels[query.data.status] || query.data.status} · {formatEUR(query.data.total)}</Text>
      {items.map((i, index) => <View key={i.product_id} style={{ gap: 8 }}><Text style={areaStyles.label}>{i.product_name}</Text>
        {draft ? <><Input label="Quantidade a encomendar" keyboardType="number-pad" value={String(i.quantity)} onChangeText={v => setItems(prev => (prev ?? items).map((p, n) => index === n ? { ...p, quantity: v } : p))} />
          <Button title="Remover produto" variant="ghost" onPress={() => setItems(prev => (prev ?? items).filter((_, n) => index !== n))} /></> :
          <Text style={areaStyles.hint}>Encomendado: {i.quantity} · Recebido: {i.received_quantity || 0} · Em falta: {Number(i.quantity) - Number(i.received_quantity || 0)}</Text>}
      </View>)}
      {draft && <Button title="Guardar rascunho" onPress={() => run("draft")} loading={busy} />}
      {draft && manager && <Button title="Validar encomenda guardada" onPress={() => run("validate")} loading={busy} />}
      {draft && <Text style={areaStyles.hint}>Guarde as quantidades antes de validar. A validação não envia a encomenda ao fornecedor.</Text>}
    </Panel>
    {manager && ["pendente", "parcial"].includes(query.data.status) && <Panel title="Rececionar mercadoria" testID="order-receipt">
      <Text style={areaStyles.hint}>Use um leitor USB/Bluetooth que escreve como teclado, ou introduza o código de barras. Cada confirmação acrescenta apenas a quantidade indicada.</Text>
      <BarcodeCamera onRead={v => { setBarcode(v); setKey(newKey()); }} />
      <Text style={areaStyles.label}>{lookup.isFetching ? "A identificar produto…" : identified ? `Produto: ${identified.name}` : barcode ? "Código não identificado" : "Leia ou introduza um código"}</Text>
      <Input label="Código de barras" value={barcode} onChangeText={v => { setBarcode(v); setKey(newKey()); }} autoCapitalize="none" autoCorrect={false} />
      <Input label="Quantidade recebida agora" value={quantity} onChangeText={v => { setQuantity(v); setKey(newKey()); }} keyboardType="decimal-pad" />
      <Button title="Confirmar receção" onPress={() => run("receive")} loading={busy} disabled={!identified || !items.some(i => i.product_id === identified.id)} />
    </Panel>}
    {manager && !["cancelada", "recebida"].includes(query.data.status) && <Button title="Cancelar encomenda" variant="danger" loading={busy} onPress={() => AppAlert.alert("Cancelar encomenda", "As receções já registadas mantêm-se. A quantidade em falta deixa de estar encomendada.", [{ text: "Voltar", style: "cancel" }, { text: "Confirmar cancelamento", style: "destructive", onPress: () => { void run("cancel"); } }])} />}
    <Feedback testID="operation-error" error message={error} />
    <Panel title="Histórico de receções" testID="receipt-history">
      {query.data.receipts.length === 0 && <Text style={areaStyles.hint}>Sem confirmações registadas.</Text>}
      {query.data.receipts.map((r: any) => <Text selectable key={r.id} style={areaStyles.hint}>{formatDateTime(r.created_at)} · {r.actor_name || "Utilizador do registo antigo"}{"\n"}{r.items.map((i: any) => `${items.find(p => p.product_id === i.product_id)?.product_name || i.product_id}: ${i.quantity}`).join(" · ")}</Text>)}
    </Panel></>}
  </AreaPage>;
}

const labels: Record<string, string> = { rascunho: "Rascunho", por_validar: "Por validar", pendente: "Por receber", parcial: "Recebida parcialmente", recebida: "Recebida", cancelada: "Cancelada" };
function newKey() { return `receipt-${Date.now()}-${Math.random().toString(36).slice(2)}`; }
