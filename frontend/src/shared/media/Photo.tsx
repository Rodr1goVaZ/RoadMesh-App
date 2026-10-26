import React, { useEffect, useState } from "react";
import { ActivityIndicator, Image, Platform, StyleSheet, View, StyleProp, ImageStyle, Text, ImageResizeMode } from "react-native";
import { API_BASE } from "@/src/core/http/api";
import { session } from "@/src/core/auth/session";
import { colors } from "@/src/shared/theme/legacy";
import { useAuth } from "@/src/core/auth/AuthProvider";

export function Photo({ mediaId, legacyUri, testID, style, resizeMode = "contain" }: { mediaId?: string; legacyUri?: string; testID: string; style: StyleProp<ImageStyle>; resizeMode?: ImageResizeMode }) {
  const { user, support } = useAuth();
  return <PhotoImage key={`${user?.id || ""}:${support?.id || ""}:${mediaId || legacyUri || ""}`} mediaId={mediaId} legacyUri={legacyUri} testID={testID} style={style} resizeMode={resizeMode} supportToken={support?.token} />;
}

function PhotoImage({ mediaId, legacyUri, testID, style, resizeMode, supportToken }: { mediaId?: string; legacyUri?: string; testID: string; style: StyleProp<ImageStyle>; resizeMode?: ImageResizeMode; supportToken?: string }) {
  const [source, setSource] = useState<any>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    let blobUrl: string | undefined;
    (async () => {
      if (!mediaId) { if (active) setSource({ uri: legacyUri }); return; }
      const token = await session.getFreshToken();
      const uri = `${API_BASE}/media/${mediaId}`;
      const headers = { Authorization: `Bearer ${token}`, ...(supportToken ? { "X-Support-Token": supportToken } : {}) };
      if (Platform.OS === "web") {
        const response = await fetch(uri, { headers });
        if (!response.ok) throw new Error("Foto indisponível");
        blobUrl = URL.createObjectURL(await response.blob());
        if (active) setSource({ uri: blobUrl }); else URL.revokeObjectURL(blobUrl);
      } else if (active) setSource({ uri, headers });
    })().catch(() => { if (active) setError(true); });
    return () => { active = false; if (blobUrl) URL.revokeObjectURL(blobUrl); };
  }, [mediaId, legacyUri, supportToken]);
  if (error) return <View style={[style, styles.center]}><Text testID={`${testID}-error`} style={styles.error}>Foto indisponível</Text></View>;
  if (!source) return <View style={[style, styles.center]}><ActivityIndicator testID={`${testID}-loading`} color={colors.brandPrimary} /></View>;
  return <Image testID={testID} source={source} style={style} resizeMode={resizeMode} onError={() => setError(true)} />;
}
const styles = StyleSheet.create({
  center: { alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceTertiary },
  error: { color: colors.muted, fontSize: 12 },
});