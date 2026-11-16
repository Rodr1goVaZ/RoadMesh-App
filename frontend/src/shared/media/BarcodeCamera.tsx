import React from "react";
import { Text } from "react-native";
import { useAreaStyles } from "@/src/shared/layout/AreaUI";
export function BarcodeCamera(_: { onRead: (code: string) => void }) {
  const areaStyles = useAreaStyles();

  return <Text style={areaStyles.hint}>Nesta versão nativa, use um leitor físico ou introduza o código manualmente.</Text>;
}
