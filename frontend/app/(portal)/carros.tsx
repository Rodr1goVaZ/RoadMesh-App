import React from "react";
import { Text, View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/src/api";
import { AreaPage, Panel, QueryState, areaStyles } from "@/src/components/AreaUI";
import { Photo } from "@/src/components/Photo";
import { Button } from "@/src/components/Button";
import { colors, radius } from "@/src/theme";
export default function MyCars() {
  const { data = [], error, isLoading, refetch } = useQuery({ queryKey: ["portal-vehicles"], queryFn: () => api.get("/portal/vehicles") });
  return <AreaPage title="Os Meus Carros" testID="portal-cars" back={false}>
    <Text testID="portal-cars-help" style={areaStyles.hint}>Tudo sobre os seus carros, das intervenções às despesas.</Text>
    <QueryState testID="portal-cars-query" loading={isLoading} error={error} retry={refetch} />
    {!isLoading && !error && !data.length && <Text testID="portal-cars-empty" style={areaStyles.hint}>Ainda não tem carros associados. Contacte a sua oficina.</Text>}
    {data.map((vehicle: any) => <Panel testID={`portal-car-${vehicle.id}`} key={vehicle.id}>
      {vehicle.cover ? <Photo mediaId={vehicle.cover.media_id} legacyUri={vehicle.cover.image_b64} testID={`portal-car-image-${vehicle.id}`} style={styles.image} /> : <View style={styles.placeholder}><Ionicons name="car-sport-outline" size={65} color={colors.brandPrimary} /><Text testID={`portal-car-no-photo-${vehicle.id}`} style={areaStyles.hint}>Sem fotografia</Text></View>}
      <Text testID={`portal-car-name-${vehicle.id}`} style={areaStyles.title}>{vehicle.make} {vehicle.model}</Text>
      <Text testID={`portal-car-plate-${vehicle.id}`} style={areaStyles.label}>{vehicle.license_plate}</Text>
      <Text testID={`portal-car-specs-${vehicle.id}`} style={areaStyles.hint}>{vehicle.year || "Ano não indicado"} · {vehicle.mileage != null ? `${vehicle.mileage.toLocaleString("pt-PT")} km` : "Quilometragem não indicada"}</Text>
      <Button testID={`portal-car-open-${vehicle.id}`} title="Ver carro e histórico" variant="secondary" onPress={() => router.push({ pathname: "/(portal)/carro", params: { id: vehicle.id } })} />
    </Panel>)}
  </AreaPage>;
}
const styles = StyleSheet.create({ image: { width: "100%", height: 180, borderRadius: radius.md, backgroundColor: colors.surface }, placeholder: { height: 170, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", borderRadius: radius.md, gap: 14 } });