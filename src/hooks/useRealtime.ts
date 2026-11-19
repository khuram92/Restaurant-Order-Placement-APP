import { useEffect } from "react";
import { connectRealtime, disconnectRealtime } from "../lib/realtime";
import { getToken } from "../lib/storage";
import type { User } from "../types/auth";

export function useRealtime(user: User | null, enabled: boolean) {
  const userId = user?._id;

  useEffect(() => {
    if (!userId || !enabled) return;
    let cancelled = false;
    getToken().then((token) => {
      if (token && !cancelled) connectRealtime(token);
    });
    return () => {
      cancelled = true;
      disconnectRealtime();
    };
  }, [userId, enabled]);
}
