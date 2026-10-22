import React from "react";
import { View, Text, useWindowDimensions } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { api } from "@/src/api";
import { AreaPage, Panel, QueryState, areaStyles } from "@/src/components/AreaUI";
import { Button } from "@/src/components/Button";
export default function ClientHistory() {
  const { data = [], error, isLoading, refetch } = useQuery({ queryKey: ["portal-vehicles"], queryFn: () => api.get("/portal/vehicles") });
  const wide = useWindowDimensions().width >= 700;
  return <AreaPage title="Histórico" testID="portal-history" back={false}>
    <Text style={areaStyles.hint}>Intervenções, orçamentos, despesas e fotografias registados pela sua oficina.</Text>
    <QueryState testID="portal-history-query" loading={isLoading} error={error} retry={refetch} />
    {!isLoading && !error && !data.length && <Text style={areaStyles.hint}>Ainda não tem viaturas associadas.</Text>}
    <View style={{ flexDirection: wide ? "row" : "column", flexWrap: "wrap", gap: 20 }}>
      {data.map((vehicle: any) => <View key={vehicle.id} style={{ width: wide ? "48%" : "100%" }}><Panel testID={`portal-history-vehicle-${vehicle.id}`} title={`${vehicle.make} ${vehicle.model}`}>
        <Text style={areaStyles.label}>{vehicle.license_plate}</Text>
        <Button title="Consultar histórico completo" onPress={() => router.push({ pathname: "/(portal)/carro", params: { id: vehicle.id } })} />
      </Panel></View>)}
    </View>
    <Button testID="portal-history-appointments" title="Histórico de marcações" variant="secondary" onPress={() => router.push("/(portal)/marcacoes")} />
  </AreaPage>;
}
