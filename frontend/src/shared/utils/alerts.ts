import { Alert, AlertButton, Platform } from "react-native";

type AlertRequest = { title: string; message: string; buttons: AlertButton[] };
const queue: AlertRequest[] = [];
const listeners = new Set<() => void>();
function changed() { listeners.forEach(listener => listener()); }

export const alertStore = {
  subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
  snapshot: () => queue[0] || null,
  dismiss: (request: AlertRequest) => { if (queue[0] === request) { queue.shift(); changed(); } },
};

/** Native alerts on devices; an accessible app dialog on web. */
export const AppAlert = {
  alert: (title: string, message = "", buttons: AlertButton[] = [{ text: "OK" }]) => {
    if (Platform.OS !== "web") { Alert.alert(title, message, buttons); return; }
    queue.push({ title, message, buttons: buttons.length ? buttons : [{ text: "OK" }] });
    changed();
  },
};
