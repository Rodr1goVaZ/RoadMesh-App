import { createThemedStyles } from "@/src/shared/theme/ThemeProvider";
import React from "react";
import { Image, View, Text } from "react-native";

import { API_BASE } from "@/src/core/http/api";

export const LOGO_URL = `${API_BASE}/brand/logo.png?v=transparent-1`;

export function Logo({ size = 48, testID = "roadmesh-logo" }: { size?: number; testID?: string }) {
  const styles = useStyles();

  return <Image testID={testID} accessibilityLabel="Logótipo RoadMesh" source={require("../../../assets/images/roadmesh-logo.png")}
    style={[styles.logo, { width: size, height: size }]} resizeMode="contain" />;
}

export function LogoWithText({ compact, testID = "roadmesh-brand" }: { compact?: boolean; testID?: string }) {
  const styles = useStyles();

  return <View style={styles.row}>
    <Logo size={compact ? 36 : 44} testID={`${testID}-logo`} />
    <Text testID={`${testID}-name`} style={[styles.name, compact && styles.compact]}>RoadMesh</Text>
  </View>;
}

const useStyles = createThemedStyles((theme) => { const colors = theme.colors; return ({
  logo: { backgroundColor: "transparent" },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  name: { fontWeight: "800", fontSize: 18, color: colors.onSurface, letterSpacing: .2 },
  compact: { fontSize: 15 },
}); });