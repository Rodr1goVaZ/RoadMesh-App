import { useAppTheme, createThemedStyles } from "@/src/shared/theme/ThemeProvider";
import React, { useState } from "react";
import { Image, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";


export function AccountAvatar({ uri, size = 44 }: { uri?: string | null; size?: number }) {
  const theme = useAppTheme();
  const c = theme.workspace;
  const s = useStyles();

  const [failedUri, setFailedUri] = useState<string | null>(null);
  return <View style={[s.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
    {uri && uri !== failedUri ? <Image accessibilityLabel="Fotografia da conta" source={{ uri }} onError={() => setFailedUri(uri)} style={{ width: size, height: size, borderRadius: size / 2 }} /> : <Ionicons name="person-outline" size={size * .48} color={c.brand} />}
  </View>;
}
const useStyles = createThemedStyles((theme) => {  return ({ avatar: { backgroundColor: theme.tones.warm, alignItems: "center", justifyContent: "center", overflow: "hidden" } }); });
