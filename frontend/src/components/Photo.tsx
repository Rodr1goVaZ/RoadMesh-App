import React, { useEffect, useState } from "react";
import { ActivityIndicator, Image, Platform, StyleSheet, View, StyleProp, ImageStyle, Text } from "react-native";
import { API_BASE } from "../api";
import { session } from "../session";
import { colors } from "../theme";

export function Photo({ mediaId, legacyUri, testID, style }: { mediaId?: string; legacyUri?: string; testID: string; style: StyleProp<ImageStyle> }) {
  const [source, setSource] = useState<any>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    let blobUrl: string | undefined;
    setSource(null); setError(false);
    (async () => {
      if (!mediaId) { if (active) setSource({ uri: legacyUri }); return; }
      const token = await session.getToken();
      const uri = `${API_BASE}/media/${mediaId}`;
      const headers = { Authorization: `Bearer ${token}` };
      if (Platform.OS === "web") {
        const response = await fetch(uri, { headers });
        if (!response.ok) throw new Error("Foto indisponível");
        blobUrl = URL.createObjectURL(await response.blob());
        if (active) setSource({ uri: blobUrl }); else URL.revokeObjectURL(blobUrl);
      } else if (active) setSource({ uri, headers });
    })().catch(() => { if (active) setError(true); });
    return () => { active = false; if (blobUrl) URL.revokeObjectURL(blobUrl); };
  }, [mediaId, legacyUri]);
  if (error) return <View style={[style, styles.center]}><Text testID={`${testID}-error`} style={styles.error}>Foto indisponível</Text></View>;
  if (!source) return <View style={[style, styles.center]}><ActivityIndicator testID={`${testID}-loading`} color={colors.brandPrimary} /></View>;
  return <Image testID={testID} source={source} style={style} resizeMode="contain" onError={() => setError(true)} />;
}
const styles = StyleSheet.create({
  center: { alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceTertiary },
  error: { color: colors.muted, fontSize: 12 },
});