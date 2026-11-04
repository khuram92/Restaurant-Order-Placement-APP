import axios from "axios";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { getToken, removeToken, saveToken } from "../lib/storage";
import { getMe } from "../services/authApi";
import type { User } from "../types/auth";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean; // true while restoring the session on app start
  signIn: (token: string, user: User) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateUser: (user: User) => void; // re-fetch user (e.g. after profile update)
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
        if (!token) return; // never logged in

        const me = await getMe(); // token attached automatically by api.ts
        setUser(me);
      } catch (error) {
        // Only log out if the token is invalid/expired, not on network errors
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
    await removeToken();
    setUser(null);
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
      value={{ user, isLoading, signIn, signOut, refreshUser, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

/** Use inside any screen: const { user, signIn, signOut } = useAuth(); */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
  return context;
};
