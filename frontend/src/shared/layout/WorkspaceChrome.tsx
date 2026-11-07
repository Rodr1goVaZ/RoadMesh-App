import React, { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet, Modal, Platform, useWindowDimensions } from "react-native";
import { router, useSegments, Href } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { workspaceColors as c } from "@/src/shared/theme/workspace";
import { useAuth } from "@/src/core/auth/AuthProvider";
import { AccountAvatar } from "@/src/features/auth/components/AccountAvatar";
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
export function WorkspaceHeader({ items, profileHref, actionHref, actionLabel, actionIcon = "notifications-outline", testID, contentWidth = 1264, contentPadding }: {
  items: WorkspaceLink[]; profileHref: Href; actionHref?: Href; actionLabel?: string; actionIcon?: React.ComponentProps<typeof Ionicons>["name"]; testID: string; contentWidth?: number; contentPadding?: number;
}) {
  const { width, height } = useWindowDimensions(); const mobile = width < 700; const insets = useSafeAreaInsets();
  const { user, logout } = useAuth(); const segments = useSegments().join("/");
  const [menu, setMenu] = useState<{ top: number; right: number; context: string } | null>(null);
  const context = `${segments}:${width}:${height}`;
  const menuVisible = menu?.context === context;
  const anchor = useRef<View>(null);
  const settings = useRef<View>(null);
  const home = items[0]?.href || "/";
  useEffect(() => {
    if (!menuVisible || Platform.OS !== "web") return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") { setMenu(null); anchor.current?.focus(); } };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [menuVisible]);
  const openMenu = () => anchor.current?.measureInWindow((x, y, w, h) => setMenu({ top: y + h + 10, right: Math.max(16, width - x - w), context }));
  const signOut = async () => { setMenu(null); await logout(); router.replace("/(auth)/login"); };
  return <View testID={testID} style={[s.headerWrap, { paddingTop: insets.top + (mobile ? 20 : 28) }]}>
    <View testID={testID + "-content"} style={[s.header, { maxWidth: contentWidth, paddingHorizontal: contentPadding ?? (mobile ? 22 : 32) }]}>
      <Pressable testID={testID + "-brand"} accessibilityRole="button" accessibilityLabel="RoadMesh — ir para o início" onPress={() => router.navigate(home)} style={s.identity}>
        <Text style={[s.brand, mobile && { fontSize: 21 }]}>RoadMesh</Text>
      </Pressable>
      <View style={[s.actions, mobile && { gap: 8 }]}>
        {mobile ? <Pressable testID={testID + "-home"} accessibilityRole="button" accessibilityLabel="Início" onPress={() => router.navigate(home)} style={s.bell}><Ionicons name="home-outline" size={21} color={c.ink} /></Pressable> : <WorkspaceNavigation items={items} />}
        {actionHref && actionLabel && <Pressable testID={testID + "-action"} accessibilityRole="button" accessibilityLabel={actionLabel} onPress={() => router.push(actionHref)} style={s.bell}><Ionicons name={actionIcon} size={22} color={c.ink} /></Pressable>}
        <Pressable ref={anchor} testID={testID + "-profile"} accessibilityRole="button" accessibilityLabel="Abrir menu da conta" accessibilityState={{ expanded: menuVisible }} onPress={openMenu} style={s.accountButton}>
          <AccountAvatar uri={user?.avatar_url} />
        </Pressable>
      </View>
    </View>
    <Modal visible={menuVisible} transparent animationType="fade" onRequestClose={() => setMenu(null)} onShow={() => settings.current?.focus()}>
      <View style={s.overlay}>
        <Pressable testID="account-menu-dismiss" accessibilityRole="button" accessibilityLabel="Fechar menu da conta" onPress={() => { setMenu(null); anchor.current?.focus(); }} style={StyleSheet.absoluteFill} />
        <View testID="account-menu" accessibilityRole="menu" accessibilityViewIsModal style={[s.menu, { top: menu?.top || 0, right: menu?.right || 16, width: Math.min(280, width - 32) }]}>
          <View style={s.menuIdentity}><Text style={s.menuName} numberOfLines={1}>{user?.name}</Text><Text style={s.menuEmail} numberOfLines={1}>{user?.email}</Text></View>
          <Pressable ref={settings} testID="account-menu-settings" accessibilityRole="menuitem" onPress={() => { setMenu(null); router.navigate(profileHref); }} style={({ pressed }) => [s.menuItem, pressed && s.menuPressed]}><Ionicons name="settings-outline" size={20} color={c.ink} /><Text style={s.menuLabel}>Definições da conta</Text></Pressable>
          <Pressable testID="account-menu-logout" accessibilityRole="menuitem" onPress={() => void signOut()} style={({ pressed }) => [s.menuItem, pressed && s.menuPressed]}><Ionicons name="log-out-outline" size={21} color={c.brand} /><Text style={[s.menuLabel, { color: c.brand }]}>Terminar sessão</Text></Pressable>
        </View>
      </View>
    </Modal>
  </View>;
}
const s = StyleSheet.create({
  headerWrap: { backgroundColor: c.background, paddingBottom: 18 }, header: { width: "100%", maxWidth: 1264, alignSelf: "center", flexDirection: "row", alignItems: "center", gap: 18 },
  identity: { flex: 1, minHeight: 44, justifyContent: "center", minWidth: 0 }, brand: { fontSize: 25, fontWeight: "800", color: c.brand, letterSpacing: -.8 },
  actions: { flexDirection: "row", alignItems: "center", gap: 18 }, accountButton: { borderRadius: 24, padding: 2, borderWidth: 1, borderColor: c.line },
  bell: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.soft, alignItems: "center", justifyContent: "center" },
  overlay: { flex: 1 }, menu: { position: "absolute", backgroundColor: c.card, borderRadius: 18, padding: 8, borderWidth: 1, borderColor: c.line, shadowColor: "#171A20", shadowOffset: { width: 0, height: 8 }, shadowOpacity: .14, shadowRadius: 24, elevation: 10 },
  menuIdentity: { padding: 12, paddingBottom: 16, marginBottom: 4, borderBottomWidth: 1, borderBottomColor: c.line, gap: 4 }, menuName: { color: c.ink, fontSize: 15, fontWeight: "700" }, menuEmail: { color: c.muted, fontSize: 12 },
  menuItem: { minHeight: 48, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 12, borderRadius: 10 }, menuLabel: { color: c.ink, fontSize: 14, fontWeight: "500" }, menuPressed: { backgroundColor: c.soft },
  nav: { flexDirection: "row", alignItems: "center", gap: 18 }, navItem: { minHeight: 44, justifyContent: "center", borderBottomWidth: 2, borderColor: "transparent" }, navLabel: { fontSize: 14, color: c.muted }, topSelected: { borderColor: c.brand },
  bottom: { gap: 4, paddingHorizontal: 12, paddingTop: 10, justifyContent: "space-around", backgroundColor: "#FFF", borderTopWidth: 1, borderTopColor: c.line },
  mobileItem: { minWidth: 52, minHeight: 56, borderRadius: 16, alignItems: "center", gap: 4, paddingHorizontal: 9, paddingVertical: 7 },
  mobileSelected: { backgroundColor: c.brand }, mobileLabel: { fontSize: 10, fontWeight: "600" },
});
