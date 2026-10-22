import React from "react";
import { Text, View, useWindowDimensions } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/src/api";
import { AreaPage, QueryState, areaStyles } from "@/src/components/AreaUI";
import { VehicleCard } from "@/src/portal/VehicleCard";
export default function MyCars() {
  const { data = [], error, isLoading, refetch } = useQuery({ queryKey: ["portal-vehicles"], queryFn: () => api.get("/portal/vehicles") });
  const wide = useWindowDimensions().width >= 900;
  return <AreaPage title="Os Meus Carros" testID="portal-cars" back={false}>
    <Text testID="portal-cars-help" style={areaStyles.hint}>Tudo sobre os seus carros, das intervenções às despesas.</Text>
    <QueryState testID="portal-cars-query" loading={isLoading} error={error} retry={refetch} />
    {!isLoading && !error && !data.length && <Text testID="portal-cars-empty" style={areaStyles.hint}>Ainda não tem carros associados. Contacte a sua oficina.</Text>}
    <View style={{ flexDirection: wide ? "row" : "column", flexWrap: "wrap", gap: 20 }}>
      {data.map((vehicle: any) => <View key={vehicle.id} style={{ width: wide ? "48.8%" : "100%" }}><VehicleCard vehicle={vehicle} /></View>)}
    </View>
  </AreaPage>;
}
