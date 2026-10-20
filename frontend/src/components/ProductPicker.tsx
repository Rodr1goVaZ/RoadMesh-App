import { ScrollView, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api";
import { Button } from "./Button";
import { Feedback } from "./Feedback";
import { colors } from "../theme";

export type StockProduct = { id: string; name: string; sale_price: number; vat_rate: number; stock: number };
export function ProductPicker({ value, onChange, testID }: { value?: string | null; onChange: (product: StockProduct | null) => void; testID: string }) {
  const { data = [], error } = useQuery<StockProduct[]>({ queryKey: ["products", "all"], queryFn: () => api.get("/products") });
  return <View style={{ gap: 8 }}>
    <Text style={{ color: colors.muted, fontSize: 13 }}>Produto de stock ou peça avulsa</Text>
    <ScrollView horizontal contentContainerStyle={{ gap: 8 }} keyboardShouldPersistTaps="handled">
      <Button testID={`${testID}-manual`} title="Peça avulsa (sem stock)" variant={!value ? "primary" : "secondary"} onPress={() => onChange(null)} />
      {data.map(product => <Button key={product.id} testID={`${testID}-${product.id}`} title={`${product.name} · stock ${product.stock}`}
        variant={value === product.id ? "primary" : "secondary"} onPress={() => onChange(product)} />)}
    </ScrollView>
    {!!value && <Text style={{ color: colors.muted, fontSize: 12 }}>O stock é descontado ao guardar a OS ou ao converter o orçamento.</Text>}
    <Feedback testID={`${testID}-error`} message={error ? "Não foi possível carregar os produtos. Volte a abrir este ecrã para tentar novamente." : ""} error />
  </View>;
}
