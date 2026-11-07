import React, { useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { workspaceColors as c } from "@/src/shared/theme/workspace";

export function AccountAvatar({ uri, size = 44 }: { uri?: string | null; size?: number }) {
  const [failedUri, setFailedUri] = useState<string | null>(null);
  return <View style={[s.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
    {uri && uri !== failedUri ? <Image accessibilityLabel="Fotografia da conta" source={{ uri }} onError={() => setFailedUri(uri)} style={{ width: size, height: size, borderRadius: size / 2 }} /> : <Ionicons name="person-outline" size={size * .48} color={c.brand} />}
  </View>;
}
const s = StyleSheet.create({ avatar: { backgroundColor: "#F1E8E9", alignItems: "center", justifyContent: "center", overflow: "hidden" } });
