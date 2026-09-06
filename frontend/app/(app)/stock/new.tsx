import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/src/api";
import { colors, spacing } from "@/src/theme";
import { Input } from "@/src/components/Input";
import { Button } from "@/src/components/Button";
import { ScreenHeader } from "@/src/components/ScreenHeader";

export default function NewProduct() {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [ref, setRef] = useState("");
  const [name, setName] = useState("");
  const [supplier, setSupplier] = useState("");
  const [category, setCategory] = useState("");
  const [stock, setStock] = useState("0");
  const [minStock, setMinStock] = useState("0");
  const [purchase, setPurchase] = useState("0");
  const [sale, setSale] = useState("0");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!ref || !name) { Alert.alert("Erro", "Referência e nome são obrigatórios"); return; }
    setLoading(true);
    try {
      await api.post("/products", {
        reference: ref, name, supplier, category,
        stock: Number(stock), min_stock: Number(minStock),
        purchase_price: Number(purchase), sale_price: Number(sale), vat_rate: 23,
      });
      qc.invalidateQueries({ queryKey: ["products"] });
      router.back();
    } catch (e: any) { Alert.alert("Erro", e.message); }
    finally { setLoading(false); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <ScreenHeader title="Novo Produto" back />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: 12, paddingBottom: insets.bottom + 100 }} keyboardShouldPersistTaps="handled">
          <Input label="Referência *" value={ref} onChangeText={setRef} autoCapitalize="characters" testID="p-ref" />
          <Input label="Nome *" value={name} onChangeText={setName} testID="p-name" />
          <Input label="Fornecedor" value={supplier} onChangeText={setSupplier} testID="p-sup" />
          <Input label="Categoria" value={category} onChangeText={setCategory} testID="p-cat" />
          <View style={{ flexDirection: "row", gap: 8 }}>
            <View style={{ flex: 1 }}><Input label="Stock atual" value={stock} onChangeText={setStock} keyboardType="numeric" testID="p-stock" /></View>
            <View style={{ flex: 1 }}><Input label="Stock mínimo" value={minStock} onChangeText={setMinStock} keyboardType="numeric" testID="p-min" /></View>
          </View>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <View style={{ flex: 1 }}><Input label="Preço compra" value={purchase} onChangeText={setPurchase} keyboardType="numeric" testID="p-buy" /></View>
            <View style={{ flex: 1 }}><Input label="Preço venda" value={sale} onChangeText={setSale} keyboardType="numeric" testID="p-sell" /></View>
          </View>
          <Button title="Guardar produto" onPress={submit} loading={loading} testID="p-save" />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
