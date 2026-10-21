import React, { useState } from "react";
import { Modal, View, FlatList, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api";
import { Button } from "./Button";
import { QueryState, areaStyles } from "./AreaUI";
import { colors } from "../theme";

export function YearFilter({ resource, value, onChange, extra = "" }: { resource: string; value: string; onChange: (year: string) => void; extra?: string }) {
  const [open, setOpen] = useState(false); const insets = useSafeAreaInsets();
  const q = useQuery({ queryKey: ["history-years", resource, extra], queryFn: () => api.get(`/history/${resource}/years${extra ? "?" + extra : ""}`), enabled: open });
  const choose = (year: string) => { onChange(year); setOpen(false); };
  return <><Button title={value ? `Ano: ${value}` : "Ano: todos"} variant="secondary" onPress={() => setOpen(true)} />
    <Modal visible={open} onRequestClose={() => setOpen(false)} animationType="slide"><View style={{ flex: 1, padding: 20, paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20, backgroundColor: colors.surface, gap: 12 }}>
      <Text style={areaStyles.title}>Ano civil · Lisboa</Text><QueryState loading={q.isLoading} error={q.error} retry={q.refetch} testID="history-years" />
      <Button title="Todos os anos" onPress={() => choose("")} />
      <FlatList data={q.data || []} keyExtractor={String} contentContainerStyle={{ gap: 8 }} renderItem={({ item }) => <Button title={String(item)} variant="secondary" onPress={() => choose(String(item))} />} />
      <Button title="Fechar" variant="ghost" onPress={() => setOpen(false)} />
    </View></Modal></>;
}
