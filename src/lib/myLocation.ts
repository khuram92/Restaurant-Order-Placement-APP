import { useSyncExternalStore } from "react";
import type { CurrentAddress } from "./location";


export type MyLocation = CurrentAddress & { precise: boolean; at: number };

let current: MyLocation | null = null;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());

export const setMyLocation = (loc: CurrentAddress, precise: boolean) => {
  if (!precise && current?.precise) return;
  current = { ...loc, precise, at: Date.now() };
  emit();
};

export const clearMyLocation = () => {
  current = null;
  emit();
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useMyLocation = () => useSyncExternalStore(subscribe, () => current);