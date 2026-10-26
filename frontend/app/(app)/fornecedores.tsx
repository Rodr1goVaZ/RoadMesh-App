import React, { useState } from "react";
import { Text } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { api } from "@/src/core/http/api";
import { AreaPage, Panel, QueryState, areaStyles } from "@/src/shared/layout/AreaUI";
import { Input } from "@/src/shared/ui/Input";
import { Button } from "@/src/shared/ui/Button";

export default function Suppliers() {
  const [search, setSearch] = useState(""); const [selected, setSelected] = useState<any>(null);
  const suppliers = useQuery({ queryKey: ["suppliers", search], queryFn: () => api.get("/suppliers?search=" + encodeURIComponent(search)) });
  const products = useQuery({ queryKey: ["supplier-products", selected?.id], queryFn: () => api.get(`/suppliers/${selected.id}/products`), enabled: !!selected });
  return <AreaPage title="Fornecedores" testID="suppliers"><Input label="Pesquisar fornecedor" value={search} onChangeText={setSearch} />
    <QueryState loading={suppliers.isLoading} error={suppliers.error} retry={suppliers.refetch} testID="supplier-query" />
    {(suppliers.data || []).map((s: any) => <Button key={s.id} variant={s.id === selected?.id ? "primary" : "secondary"} title={s.name} onPress={() => setSelected(s)} />)}
    {selected && <Panel title={selected.name + " · produtos disponíveis"} testID="supplier-products">
      <QueryState loading={products.isLoading} error={products.error} retry={products.refetch} testID="supplier-products-query" />
      {products.data?.length === 0 && <Text style={areaStyles.hint}>Sem produtos com stock disponível deste fornecedor.</Text>}
      {(products.data || []).map((p: any) => <Button key={p.id} variant="secondary" title={`${p.name} · ${p.reference} · stock ${p.stock}`} onPress={() => router.push({ pathname: "/(app)/stock/[id]", params: { id: p.id } })} />)}
    </Panel>}</AreaPage>;
}
