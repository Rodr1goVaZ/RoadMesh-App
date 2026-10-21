import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
/** Retains filters when a list remounts. Auth/support changes clear this cache. */
export function useListState<T>(key: string, initial: T): [T, (value: T) => void] {
  const qc = useQueryClient();
  const [value, setValue] = useState<T>(() => qc.getQueryData<T>(["view-state", key]) ?? initial);
  return [value, next => { qc.setQueryData(["view-state", key], next); setValue(next); }];
}
