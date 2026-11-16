import { useAppTheme, createThemedStyles } from "@/src/shared/theme/ThemeProvider";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, Pressable, ScrollView, Platform, useWindowDimensions } from "react-native";
import { router, useSegments, Href } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/src/core/auth/AuthProvider";
import { AccountMenuLayer } from "./AccountMenuLayer";
import { Logo } from "@/src/shared/ui/Logo";
import { AppearanceToggle } from "@/src/shared/ui/AppearanceToggle";
import { AccountAvatar } from "@/src/features/auth/components/AccountAvatar";
export type WorkspaceLink = { label: string; href: Href; icon: React.ComponentProps<typeof Ionicons>["name"]; activeIcon?: React.ComponentProps<typeof Ionicons>["name"]; testID: string; matches: string[] };
export function WorkspaceNavigation({ items, mobile = false }: { items: WorkspaceLink[]; mobile?: boolean }) {
  const theme = useAppTheme();
  const c = theme.workspace;
  const s = useStyles();

  const segments = useSegments() as string[]; const path = segments.join("/");
  const insets = useSafeAreaInsets();
  return <View accessibilityRole="tablist" style={[s.nav, mobile && [s.bottom, { paddingBottom: Math.max(insets.bottom, 10) }]]}>
    {items.map(item => {
      const selected = item.matches.some(match => path === match || path.startsWith(match + "/"));
      return <Pressable key={item.testID} testID={item.testID} accessibilityRole="tab" accessibilityLabel={item.label} accessibilityState={{ selected }} onPress={() => router.navigate(item.href)}
        style={({ pressed }) => [s.navItem, mobile && s.mobileItem, !mobile && selected && s.topSelected, mobile && selected && s.mobileSelected, pressed && { opacity: .7 }]}>
        {mobile && <Ionicons name={selected ? item.activeIcon || item.icon : item.icon} size={22} color={selected ? theme.tones.onAction : c.muted} />}
        <Text style={[s.navLabel, selected && { color: c.brand }, mobile && s.mobileLabel, mobile && selected && { color: theme.tones.onAction }]}>{item.label}</Text>
      </Pressable>;
    })}
  </View>;
}
export function WorkspaceHeader({ items, profileHref, actionHref, actionLabel, actionIcon = "notifications-outline", testID, contentWidth = 1264, contentPadding }: {
  items: WorkspaceLink[]; profileHref: Href; actionHref?: Href; actionLabel?: string; actionIcon?: React.ComponentProps<typeof Ionicons>["name"]; testID: string; contentWidth?: number; contentPadding?: number;
}) {
  const theme = useAppTheme();
  const c = theme.workspace;
  const s = useStyles();

  const { width, height } = useWindowDimensions(); const mobile = width < 700; const insets = useSafeAreaInsets();
  const { user, logout } = useAuth(); const segments = useSegments().join("/");
  const [menu, setMenu] = useState<{ top: number; right: number; context: string } | null>(null);
  const context = `${segments}:${width}:${height}`;
  const menuVisible = menu?.context === context && menu !== null;
  const anchor = useRef<View>(null);
  const settings = useRef<View>(null);
  const menuRoot = useRef<View>(null);
  const opening = useRef(false);
  const requestId = useRef(0);
  const dismissMenu = useCallback(() => { requestId.current++; opening.current = false; setMenu(null); }, []);
  const focusSettings = useCallback(() => settings.current?.focus(), []);
  useEffect(() => () => { requestId.current++; opening.current = false; }, [context]);
  const home = items[0]?.href || "/";
  useEffect(() => {
    if (!menuVisible || Platform.OS !== "web") return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") { dismissMenu(); anchor.current?.focus(); } };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [menuVisible, dismissMenu]);
  const toggleMenu = () => {
    if (menuVisible || opening.current) { dismissMenu(); return; }
    const request = ++requestId.current;
    opening.current = true;
    anchor.current?.measureInWindow((x, y, w, h) => {
      if (request !== requestId.current) return;
      opening.current = false;
      if (w > 0 && h > 0) setMenu({ top: y + h + 10, right: Math.max(16, width - x - w), context });
    });
  };
  const signOut = async () => { dismissMenu(); await logout(); router.replace("/(auth)/login"); };
  return <View testID={testID} style={[s.headerWrap, { paddingTop: insets.top + (mobile ? 20 : 28) }]}>
    <View testID={testID + "-content"} style={[s.header, { maxWidth: contentWidth, paddingHorizontal: contentPadding ?? (mobile ? 22 : 32) }]}>
      <Pressable testID={testID + "-brand"} accessibilityRole="button" accessibilityLabel="RoadMesh — ir para o início" onPress={() => router.navigate(home)} style={s.identity}>
        <Logo size={mobile ? 44 : 48} testID={testID + "-logo"} />
      </Pressable>
      <View style={[s.actions, mobile && { gap: 8 }]}>
        {mobile ? <Pressable testID={testID + "-home"} accessibilityRole="button" accessibilityLabel="Início" onPress={() => router.navigate(home)} style={s.bell}><Ionicons name="home-outline" size={21} color={c.ink} /></Pressable> : <WorkspaceNavigation items={items} />}
        {actionHref && actionLabel && <Pressable testID={testID + "-action"} accessibilityRole="button" accessibilityLabel={actionLabel} onPress={() => router.push(actionHref)} style={s.bell}><Ionicons name={actionIcon} size={22} color={c.ink} /></Pressable>}
        <Pressable ref={anchor} testID={testID + "-profile"} accessibilityRole="button" accessibilityLabel="Abrir menu da conta" aria-expanded={menuVisible} accessibilityState={{ expanded: menuVisible }} onPress={toggleMenu} style={s.accountButton}>
          <AccountAvatar uri={user?.avatar_url} />
        </Pressable>
      </View>
    </View>
    <AccountMenuLayer visible={menuVisible} anchor={anchor} menu={menuRoot} onDismiss={dismissMenu} onShow={focusSettings}>
        <View ref={menuRoot} pointerEvents="auto" testID="account-menu" accessibilityRole="menu" accessibilityViewIsModal={Platform.OS !== "web"} style={[s.menu, { top: menu?.top || 0, right: menu?.right || 16, width: Math.min(280, width - 32), maxHeight: Math.max(120, height - (menu?.top || 0) - 16) }]}>
          <ScrollView keyboardShouldPersistTaps="handled" bounces={false}><View style={s.menuIdentity}><Text style={s.menuName} numberOfLines={1}>{user?.name}</Text><Text style={s.menuEmail} numberOfLines={1}>{user?.email}</Text></View>
          <View style={s.themeSection}><Text style={s.themeCaption}>Aparência</Text><AppearanceToggle /></View>
          <Pressable ref={settings} testID="account-menu-settings" accessibilityRole="menuitem" onPress={() => { dismissMenu(); router.navigate(profileHref); }} style={({ pressed }) => [s.menuItem, pressed && s.menuPressed]}><Ionicons name="settings-outline" size={20} color={c.ink} /><Text style={s.menuLabel}>Definições da conta</Text></Pressable>
          <Pressable testID="account-menu-logout" accessibilityRole="menuitem" onPress={() => void signOut()} style={({ pressed }) => [s.menuItem, pressed && s.menuPressed]}><Ionicons name="log-out-outline" size={21} color={c.brand} /><Text style={[s.menuLabel, { color: c.brand }]}>Terminar sessão</Text></Pressable></ScrollView>
        </View>
    </AccountMenuLayer>
  </View>;
}
const useStyles = createThemedStyles((theme) => { const c = theme.workspace; return ({
  headerWrap: { backgroundColor: c.background, paddingBottom: 18 }, header: { width: "100%", maxWidth: 1264, alignSelf: "center", flexDirection: "row", alignItems: "center", gap: 18 },
  identity: { flex: 1, minHeight: 44, justifyContent: "center", alignItems: "flex-start", minWidth: 0 },
  actions: { flexDirection: "row", alignItems: "center", gap: 18 }, accountButton: { borderRadius: 24, padding: 2, borderWidth: 1, borderColor: c.line },
  bell: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.soft, alignItems: "center", justifyContent: "center" },
  menu: { position: "absolute", backgroundColor: c.card, borderRadius: 18, padding: 8, borderWidth: 1, borderColor: c.line, shadowColor: theme.tones.shadow, shadowOffset: { width: 0, height: 8 }, shadowOpacity: .14, shadowRadius: 24, elevation: 10 },
  menuIdentity: { padding: 12, paddingBottom: 16, marginBottom: 4, borderBottomWidth: 1, borderBottomColor: c.line, gap: 4 }, menuName: { color: c.ink, fontSize: 15, fontWeight: "700" }, menuEmail: { color: c.muted, fontSize: 12 },
  themeSection: { padding: 8, gap: 8, borderBottomWidth: 1, borderBottomColor: c.line, marginBottom: 4, paddingBottom: 12 }, themeCaption: { fontSize: 12, color: c.muted, paddingHorizontal: 4 },
  menuItem: { minHeight: 48, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 12, borderRadius: 10 }, menuLabel: { color: c.ink, fontSize: 14, fontWeight: "500" }, menuPressed: { backgroundColor: c.soft },
  nav: { flexDirection: "row", alignItems: "center", gap: 18 }, navItem: { minHeight: 44, justifyContent: "center", borderBottomWidth: 2, borderColor: "transparent" }, navLabel: { fontSize: 14, color: c.muted }, topSelected: { borderColor: c.brand },
  bottom: { gap: 4, paddingHorizontal: 12, paddingTop: 10, justifyContent: "space-around", backgroundColor: theme.tones.card, borderTopWidth: 1, borderTopColor: c.line },
  mobileItem: { minWidth: 52, minHeight: 56, borderRadius: 16, alignItems: "center", gap: 4, paddingHorizontal: 9, paddingVertical: 7 },
  mobileSelected: { backgroundColor: c.brandFill }, mobileLabel: { fontSize: 10, fontWeight: "600" },
}); });
