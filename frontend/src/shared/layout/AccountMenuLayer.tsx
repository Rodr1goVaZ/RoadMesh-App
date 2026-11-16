import type { PropsWithChildren, RefObject } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";

export type AccountMenuLayerProps = PropsWithChildren<{
  visible: boolean;
  anchor: RefObject<View | null>;
  menu: RefObject<View | null>;
  onDismiss: () => void;
  onShow: () => void;
}>;

export function AccountMenuLayer({ visible, onDismiss, onShow, children }: AccountMenuLayerProps) {
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss} onShow={onShow}>
    <View style={{ flex: 1 }}>
      <Pressable testID="account-menu-dismiss" accessibilityRole="button" accessibilityLabel="Fechar menu da conta" onPress={onDismiss} style={StyleSheet.absoluteFill} />
      {children}
    </View>
  </Modal>;
}
