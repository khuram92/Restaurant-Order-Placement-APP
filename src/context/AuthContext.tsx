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
  isLoading: boolean; 
  signIn: (token: string, user: User) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateUser: (user: User) => void; 
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

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
  return context;
};
