import axios from "axios";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Alert } from "react-native";
import { setSessionEndedHandler } from "../lib/api";
import { clearMyLocation } from "../lib/myLocation";
import { getCurrentPushToken } from "../lib/notifications";
import { reconnectRealtime } from "../lib/realtime";
import { getToken, removeToken, saveToken } from "../lib/storage";
import { getMe } from "../services/authApi";
import { removePushToken } from "../services/pushApi";
import type { User } from "../types/auth";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  signIn: (token: string, user: User) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateUser: (user: User) => void;
  replaceToken: (token: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session when the app opens
  useEffect(() => {
    const restore = async () => {
      try {
        const token = await getToken();
        if (!token) return;

        const me = await getMe();
        setUser(me);
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 401) {
          await removeToken();
        }
      } finally {
        setIsLoading(false);
      }
    };

    restore();
  }, []);

  const signIn = useCallback(async (token: string, newUser: User) => {
    await saveToken(token);
    setUser(newUser);
  }, []);

  const signOut = useCallback(async () => {
    const pushToken = getCurrentPushToken();
    if (pushToken) await removePushToken(pushToken).catch(() => {});
    await removeToken();
    clearMyLocation();
    setUser(null);
  }, []);
  const ending = useRef(false);
  useEffect(() => {
    setSessionEndedHandler((reason) => {
      if (ending.current) return;
      ending.current = true;
      void (async () => {
        await removeToken();
        clearMyLocation();
        setUser(null);
        Alert.alert(
          "You've been signed out",
          reason === "Invalid or expired token"
            ? "Your login expired. Please sign in again."
            : "Your session ended on this phone (password changed, logged out from another device, or account updated). Please sign in again.",
        );
        ending.current = false;
      })();
    });
    return () => setSessionEndedHandler(null);
  }, []);

  /** Keep this phone logged in with a fresh token from the server */
  const replaceToken = useCallback(async (token: string) => {
    await saveToken(token);
    reconnectRealtime(token);
  }, []);
  const refreshUser = useCallback(async () => {
    const me = await getMe();
    setUser(me);
  }, []);
  const updateUser = useCallback((updated: User) => {
    setUser(updated);
  }, []);
  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        signIn,
        signOut,
        refreshUser,
        updateUser,
        replaceToken,
      }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
  return context;
};
