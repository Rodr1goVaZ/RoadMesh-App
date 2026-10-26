import { goBack } from "@/src/shared/utils/navigation";
import React, { useState } from "react";
import { View, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { AppAlert as Alert } from "@/src/shared/utils/alerts";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/src/core/http/api";
import { colors, spacing } from "@/src/shared/theme/legacy";
import { Input } from "@/src/shared/ui/Input";
import { Button } from "@/src/shared/ui/Button";
import { ScreenHeader } from "@/src/shared/layout/ScreenHeader";

export default function NewVehicle() {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { client_id } = useLocalSearchParams<{ client_id: string }>();
  const [plate, setPlate] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [vin, setVin] = useState("");
  const [mileage, setMileage] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!plate || !make || !model) { Alert.alert("Erro", "Preencha matrícula, marca e modelo"); return; }
    setLoading(true);
    try {
      await api.post("/vehicles", {
        client_id, license_plate: plate.toUpperCase(), make, model,
        year: year ? Number(year) : null, vin, mileage: mileage ? Number(mileage) : null,
      });
      qc.invalidateQueries({ queryKey: ["client", client_id] });
      qc.invalidateQueries({ queryKey: ["vehicles-all"] });
      goBack();
    } catch (e: any) { Alert.alert("Erro", e.message); }
    finally { setLoading(false); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <ScreenHeader title="Nova Viatura" back />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ width: "100%", maxWidth: 1100, alignSelf: "center", padding: spacing.lg, gap: 12, paddingBottom: insets.bottom + 100 }} keyboardShouldPersistTaps="handled">
          <Input label="Matrícula *" value={plate} onChangeText={setPlate} autoCapitalize="characters" testID="v-plate" />
          <Input label="Marca *" value={make} onChangeText={setMake} testID="v-make" />
          <Input label="Modelo *" value={model} onChangeText={setModel} testID="v-model" />
          <Input label="Ano" value={year} onChangeText={setYear} keyboardType="numeric" testID="v-year" />
          <Input label="VIN" value={vin} onChangeText={setVin} autoCapitalize="characters" testID="v-vin" />
          <Input label="Quilometragem" value={mileage} onChangeText={setMileage} keyboardType="numeric" testID="v-mileage" />
          <Button title="Guardar viatura" onPress={submit} loading={loading} testID="v-save" />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
