import { parseDecimal as num } from "@/src/shared/utils/validation";
import { saleFromMargin } from "@/src/features/finance/pricing";
import React, { useState } from "react";
import { Switch, Text } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/src/core/http/api";
import { Panel, areaStyles } from "@/src/shared/layout/AreaUI";
import { Input } from "@/src/shared/ui/Input";
import { Button } from "@/src/shared/ui/Button";
import { Feedback } from "@/src/shared/ui/Feedback";

export function ProductSettings({ product }: { product: any }) {
  const qc = useQueryClient(); const [barcode, setBarcode] = useState(product.barcode || "");
  const [enabled, setEnabled] = useState(!!product.restock_enabled); const [min, setMin] = useState(String(product.min_stock));
  const [buy, setBuy] = useState(String(product.purchase_price)); const [sell, setSell] = useState(String(product.sale_price));
  const [supplier, setSupplier] = useState(product.supplier || ""); const [vat, setVat] = useState(String(product.vat_rate));
  const [marginInput, setMarginInput] = useState(""); const [marginError, setMarginError] = useState("");
  const applyMargin = (value: string) => {
    setMarginInput(value); setMarginError("");
    if (!value.trim()) return;
    try { setSell(saleFromMargin(buy, value)); } catch (e: any) { setMarginError(e.message); }
  };
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [message, setMessage] = useState("");
  const save = async () => {
    setBusy(true); setError(""); setMessage("");
    try {
      await api.put(`/products/${product.id}`, { reference: product.reference, name: product.name, category: product.category,
        supplier, barcode: barcode.trim() || null, restock_enabled: enabled, min_stock: num(min),
        profit_margin: marginInput ? num(marginInput) : null, purchase_price: num(buy), sale_price: num(sell), vat_rate: num(vat) });
      await Promise.all(["product", "products", "purchase-orders", "suppliers"].map(k => qc.invalidateQueries({ queryKey: [k] })));
      setMessage("Produto atualizado.");
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };
  const sale = num(sell); const margin = sale > 0 ? ((sale - num(buy)) / sale * 100).toFixed(2) + "%" : "indisponível";
  return <Panel title="Configuração do produto" testID="product-settings">
    <Input label="Fornecedor" value={supplier} onChangeText={setSupplier} />
    <Input label="Código de barras" value={barcode} onChangeText={setBarcode} autoCapitalize="none" autoCorrect={false} />
    <Input label="Preço de compra sem IVA (€)" value={buy} onChangeText={v => { setBuy(v); setMarginInput(""); setMarginError(""); }} keyboardType="decimal-pad" />
    <Input label="Margem sobre venda (%)" value={marginInput} onChangeText={applyMargin} keyboardType="decimal-pad" error={marginError} />
    <Input label="Preço de venda sem IVA (€)" value={sell} onChangeText={v => { setSell(v); setMarginInput(""); setMarginError(""); }} keyboardType="decimal-pad" />
    <Input label="IVA (%)" value={vat} onChangeText={setVat} keyboardType="decimal-pad" />
    <Text style={areaStyles.hint}>Margem bruta sobre o preço de venda: {margin}</Text>
    <Input label="Stock mínimo" value={min} onChangeText={setMin} keyboardType="decimal-pad" />
    <Text style={areaStyles.label}>Reposição automática</Text><Switch value={enabled} onValueChange={setEnabled} />
    <Text style={areaStyles.hint}>Cria uma proposta Por validar quando o stock atinge o mínimo. O responsável revê as quantidades e valida a encomenda.</Text>
    <Feedback testID="product-settings-error" error message={error} /><Feedback testID="product-settings-success" message={message} />
    <Button title="Guardar configuração" onPress={save} loading={busy} disabled={!!marginError} />
  </Panel>;
}

