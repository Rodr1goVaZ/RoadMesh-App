import React from "react";
import { View, Text, Pressable, StyleSheet, useWindowDimensions } from "react-native";
import { router, useSegments, Href } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { workspaceColors as c } from "@/src/shared/theme/workspace";
export type WorkspaceLink = { label: string; href: Href; icon: React.ComponentProps<typeof Ionicons>["name"]; activeIcon?: React.ComponentProps<typeof Ionicons>["name"]; testID: string; matches: string[] };
export function WorkspaceNavigation({ items, mobile = false }: { items: WorkspaceLink[]; mobile?: boolean }) {
  const segments = useSegments() as string[]; const path = segments.join("/");
  const insets = useSafeAreaInsets();
  return <View accessibilityRole="tablist" style={[s.nav, mobile && [s.bottom, { paddingBottom: Math.max(insets.bottom, 10) }]]}>
    {items.map(item => {
      const selected = item.matches.some(match => path === match || path.startsWith(match + "/"));
      return <Pressable key={item.testID} testID={item.testID} accessibilityRole="tab" accessibilityLabel={item.label} accessibilityState={{ selected }} onPress={() => router.navigate(item.href)}
        style={({ pressed }) => [s.navItem, mobile && s.mobileItem, !mobile && selected && s.topSelected, mobile && selected && s.mobileSelected, pressed && { opacity: .7 }]}>
        {mobile && <Ionicons name={selected ? item.activeIcon || item.icon : item.icon} size={22} color={selected ? "#FFF" : c.muted} />}
        <Text style={[s.navLabel, selected && { color: c.brand }, mobile && s.mobileLabel, mobile && selected && { color: "#FFF" }]}>{item.label}</Text>
      </Pressable>;
    })}
  </View>;
}
export function WorkspaceHeader({ name, subtitle, items, profileHref, actionHref, actionLabel, actionIcon = "notifications-outline", testID }: {
  name: string; subtitle: string; items: WorkspaceLink[]; profileHref: Href; actionHref: Href; actionLabel: string; actionIcon?: React.ComponentProps<typeof Ionicons>["name"]; testID: string;
}) {
  const mobile = useWindowDimensions().width < 700; const insets = useSafeAreaInsets();
  const initials = name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase();
  return <View style={[s.headerWrap, { paddingTop: insets.top + (mobile ? 20 : 28) }]}>
    <View style={[s.header, { paddingHorizontal: mobile ? 22 : 32 }]}>
      <Pressable testID={testID + "-profile"} accessibilityRole="button" accessibilityLabel="Abrir a minha conta" onPress={() => router.navigate(profileHref)} style={s.identity}>
        <View style={s.avatar}><Text style={s.initials}>{initials}</Text></View>
        <View style={s.names}><Text style={s.welcome} numberOfLines={1}>{subtitle}</Text><Text numberOfLines={1} style={s.name}>{name}</Text></View>
      </Pressable>
      {!mobile && <WorkspaceNavigation items={items} />}
      <Pressable testID={testID + "-action"} accessibilityRole="button" accessibilityLabel={actionLabel} onPress={() => router.push(actionHref)} style={s.bell}><Ionicons name={actionIcon} size={22} color={c.ink} /></Pressable>
    </View>
  </View>;
}
const s = StyleSheet.create({
  headerWrap: { backgroundColor: c.background, paddingBottom: 18 }, header: { width: "100%", maxWidth: 1264, alignSelf: "center", flexDirection: "row", alignItems: "center", gap: 18 },
  identity: { flex: 1, flexDirection: "row", gap: 12, alignItems: "center", minWidth: 0 }, names: { flexShrink: 1, minWidth: 0 },
  avatar: { width: 44, height: 44, borderRadius: 24, backgroundColor: "#F1E8E9", borderWidth: 2, borderColor: "#FFF", alignItems: "center", justifyContent: "center" },
  initials: { fontSize: 14, fontWeight: "700", color: c.brand }, welcome: { fontSize: 12, color: c.muted, marginBottom: 3 },
  name: { fontSize: 17, fontWeight: "700", color: c.ink }, bell: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.soft, alignItems: "center", justifyContent: "center" },
  nav: { flexDirection: "row", alignItems: "center", gap: 18 }, navItem: { minHeight: 44, justifyContent: "center", borderBottomWidth: 2, borderColor: "transparent" }, navLabel: { fontSize: 14, color: c.muted }, topSelected: { borderColor: c.brand },
  bottom: { gap: 4, paddingHorizontal: 12, paddingTop: 10, justifyContent: "space-around", backgroundColor: "#FFF", borderTopWidth: 1, borderTopColor: c.line },
  mobileItem: { minWidth: 52, minHeight: 56, borderRadius: 16, alignItems: "center", gap: 4, paddingHorizontal: 9, paddingVertical: 7 },
  mobileSelected: { backgroundColor: c.brand }, mobileLabel: { fontSize: 10, fontWeight: "600" },
});
