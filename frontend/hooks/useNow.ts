import { useEffect, useState } from "react";
import { AppState } from "react-native";

/** Update time-dependent UI while open and immediately on returning to the app. */
export function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const update = () => setNow(Date.now());
    const timer = setInterval(update, 30000);
    const listener = AppState.addEventListener("change", state => { if (state === "active") update(); });
    return () => { clearInterval(timer); listener.remove(); };
  }, []);
  return now;
}
