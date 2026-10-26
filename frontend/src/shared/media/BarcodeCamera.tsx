import React from "react";
import { Text } from "react-native";
import { areaStyles } from "@/src/shared/layout/AreaUI";
export function BarcodeCamera(_: { onRead: (code: string) => void }) {
  return <Text style={areaStyles.hint}>Nesta versão nativa, use um leitor físico ou introduza o código manualmente.</Text>;
}
