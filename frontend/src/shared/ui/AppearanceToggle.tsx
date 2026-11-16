import { useEffect, useState, type KeyboardEvent } from "react";
import { AccessibilityInfo, Animated, Easing, Platform, Pressable, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { createThemedStyles, useAppTheme } from "@/src/shared/theme/ThemeProvider";

export function AppearanceToggle() {
  const { scheme, setScheme, workspace: c } = useAppTheme();
  const s = useStyles();
  const dark = scheme === "dark";
  const [position] = useState(() => new Animated.Value(dark ? 0 : 1));
  const [width, setWidth] = useState(212);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => {
      if (active) setReduceMotion(value);
    }).catch(() => {});
    const listener = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    return () => { active = false; listener.remove(); };
  }, []);

  useEffect(() => {
    const target = dark ? 0 : 1;
    if (reduceMotion) {
      position.setValue(target);
      return;
    }
    const animation = Animated.timing(position, {
      toValue: target,
      duration: 240,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [dark, position, reduceMotion]);

  // React Native Web handles Enter for switches; Space needs an explicit handler.
  const keyboardProps = Platform.OS === "web" ? {
    onKeyDown: (event: KeyboardEvent) => {
      if (event.key === " " || event.key === "Spacebar") {
        event.preventDefault();
        event.stopPropagation();
        if (!event.repeat) setScheme(dark ? "light" : "dark");
      }
    },
  } : {};

  return <Pressable
    {...keyboardProps}
    testID="account-theme-toggle"
    accessibilityRole="switch"
    accessibilityLabel="Modo escuro"
    accessibilityHint={dark ? "Mudar para o modo claro" : "Mudar para o modo escuro"}
    accessibilityState={{ checked: dark }}
    aria-checked={dark}
    accessibilityValue={{ text: dark ? "Modo escuro" : "Modo claro" }}
    onPress={() => setScheme(dark ? "light" : "dark")}
    onLayout={event => setWidth(event.nativeEvent.layout.width)}
    style={({ pressed }) => [s.track, pressed && { opacity: .8 }]}
  >
    <Animated.View pointerEvents="none" style={[s.selection, {
      width: Math.max(0, (width - 8) / 2),
      transform: [{ translateX: position.interpolate({ inputRange: [0, 1], outputRange: [0, Math.max(0, (width - 8) / 2)] }) }],
    }]} />
    <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={s.labels}>
      <View style={s.option}><Ionicons name="moon-outline" size={16} color={dark ? c.brand : c.muted} /><Text style={[s.label, dark && s.activeLabel]}>DARK</Text></View>
      <View style={s.option}><Ionicons name="sunny-outline" size={16} color={dark ? c.muted : c.brand} /><Text style={[s.label, !dark && s.activeLabel]}>LIGHT</Text></View>
    </View>
  </Pressable>;
}

const useStyles = createThemedStyles(({ workspace: c }) => ({
  track: { width: 212, maxWidth: "100%", minHeight: 44, alignSelf: "flex-start", backgroundColor: c.soft, borderWidth: 1, borderColor: c.line, padding: 3, borderRadius: 999, overflow: "hidden" },
  selection: { position: "absolute", left: 3, top: 3, bottom: 3, borderRadius: 999, backgroundColor: c.warm, borderWidth: 1, borderColor: c.brand },
  labels: { flex: 1, flexDirection: "row" },
  option: { flex: 1, minHeight: 36, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 7 },
  label: { color: c.muted, fontSize: 12, letterSpacing: .4, fontWeight: "500" },
  activeLabel: { color: c.ink, fontWeight: "600" },
}));
