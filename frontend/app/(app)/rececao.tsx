import React, { useState } from "react";
import { Text } from "react-native";
import { router } from "expo-router";
import { AreaPage, Panel, areaStyles } from "@/src/shared/layout/AreaUI";
import { VehiclePicker } from "@/src/shared/pickers/VehiclePicker";
import { Button } from "@/src/shared/ui/Button";
export default function VehicleReception() {
  const [vehicleId, setVehicleId] = useState("");
  return <AreaPage title="Receção de veículos" testID="vehicle-reception" back={false}>
    <Text accessibilityRole="header" style={areaStyles.title}>Receção de veículos</Text><Text style={areaStyles.hint}>Registe o estado da viatura à entrada com fotografias e danos, para salvaguarda da empresa e do cliente.</Text>
    <Panel testID="reception-vehicle" title="Selecionar viatura"><VehiclePicker value={vehicleId} onChange={setVehicleId} /></Panel>
    <Button title="Fotografar e consultar estado da viatura" testID="reception-photos" disabled={!vehicleId} onPress={() => router.push({ pathname: "/(app)/fotos/[vehicleId]", params: { vehicleId } })} />
    <Button title="Registar danos à entrada" testID="reception-damages" variant="secondary" disabled={!vehicleId} onPress={() => router.push({ pathname: "/(app)/danos", params: { vehicle_id: vehicleId } })} />
  </AreaPage>;
}
