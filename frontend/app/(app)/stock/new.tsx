import { saleFromMargin } from "@/src/features/finance/pricing";
import { goBack } from "@/src/shared/utils/navigation";
import React, { useState } from "react";
import { View, Text, ScrollView, KeyboardAvoidingView, Platform, Switch } from "react-native";
import { AppAlert as Alert } from "@/src/shared/utils/alerts";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/src/core/http/api";
import { colors, spacing } from "@/src/shared/theme/legacy";
import { Input } from "@/src/shared/ui/Input";
import { Button } from "@/src/shared/ui/Button";
import { ScreenHeader } from "@/src/shared/layout/ScreenHeader";

export default function NewProduct() {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [barcode, setBarcode] = useState("");
  const [restock, setRestock] = useState(false);
  const [ref, setRef] = useState("");
  const [name, setName] = useState("");
  const [supplier, setSupplier] = useState("");
  const [category, setCategory] = useState("");
  const [stock, setStock] = useState("0");
  const [minStock, setMinStock] = useState("0");
  const [purchase, setPurchase] = useState("0");
  const [sale, setSale] = useState("0");
  const [marginInput, setMarginInput] = useState(""); const [marginError, setMarginError] = useState("");
  const applyMargin = (value: string) => {
    setMarginInput(value); setMarginError("");
    if (!value.trim()) return;
    try { setSale(saleFromMargin(purchase, value)); } catch (e: any) { setMarginError(e.message); }
  };
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!ref || !name) { Alert.alert("Erro", "Referência e nome são obrigatórios"); return; }
    setLoading(true);
    try {
      await api.post("/products", {
        reference: ref, name, supplier, category, barcode: barcode.trim() || null, restock_enabled: restock,
        stock: Number(stock.replace(",", ".")), min_stock: Number(minStock.replace(",", ".")),
        profit_margin: marginInput ? Number(marginInput.replace(",", ".")) : null, purchase_price: Number(purchase.replace(",", ".")), sale_price: Number(sale.replace(",", ".")), vat_rate: 23,
      });
      qc.invalidateQueries({ queryKey: ["products"] });
      goBack();
    } catch (e: any) { Alert.alert("Erro", e.message); }
    finally { setLoading(false); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <ScreenHeader title="Novo Produto" back />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ width: "100%", maxWidth: 1100, alignSelf: "center", padding: spacing.lg, gap: 12, paddingBottom: insets.bottom + 100 }} keyboardShouldPersistTaps="handled">
          <Input label="Referência *" value={ref} onChangeText={setRef} autoCapitalize="characters" testID="p-ref" />
          <Input label="Nome *" value={name} onChangeText={setName} testID="p-name" />
          <Input label="Fornecedor" value={supplier} onChangeText={setSupplier} testID="p-sup" />
          <Input label="Código de barras" value={barcode} onChangeText={setBarcode} autoCapitalize="none" />
          <Text style={{ color: colors.onSurface }}>Reposição automática · cria propostas por validar</Text><Switch value={restock} onValueChange={setRestock} />
          <Input label="Categoria" value={category} onChangeText={setCategory} testID="p-cat" />
          <View style={{ flexDirection: "row", gap: 8 }}>
            <View style={{ flex: 1 }}><Input label="Stock atual" value={stock} onChangeText={setStock} keyboardType="numeric" testID="p-stock" /></View>
            <View style={{ flex: 1 }}><Input label="Stock mínimo" value={minStock} onChangeText={setMinStock} keyboardType="numeric" testID="p-min" /></View>
          </View>
          <Input label="Margem sobre venda (%)" value={marginInput} onChangeText={applyMargin} keyboardType="decimal-pad" error={marginError} />
          <View style={{ flexDirection: "row", gap: 8 }}>
            <View style={{ flex: 1 }}><Input label="Preço compra" value={purchase} onChangeText={v => { setPurchase(v); setMarginInput(""); setMarginError(""); }} keyboardType="numeric" testID="p-buy" /></View>
            <View style={{ flex: 1 }}><Input label="Preço venda" value={sale} onChangeText={v => { setSale(v); setMarginInput(""); setMarginError(""); }} keyboardType="numeric" testID="p-sell" /></View>
          </View>
          <Text style={{ color: colors.muted }}>Margem bruta: {Number(sale.replace(",", ".")) > 0 ? ((Number(sale.replace(",", ".")) - Number(purchase.replace(",", "."))) / Number(sale.replace(",", ".")) * 100).toFixed(2) + "%" : "indisponível"}</Text>
          <Button title="Guardar produto" onPress={submit} loading={loading} disabled={!!marginError} testID="p-save" />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
