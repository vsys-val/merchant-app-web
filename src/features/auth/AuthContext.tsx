import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { getCurrentUser, login as loginRequest, User } from "./auth-api";
import { readToken, removeToken, saveToken } from "./auth-storage";

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  signIn(email: string, password: string): Promise<void>;
  signOut(): void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(readToken);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(token));

  useEffect(() => {
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    getCurrentUser(token)
      .then(setUser)
      .catch(() => {
        removeToken();
        setToken(null);
        setUser(null);
      })
      .finally(() => setIsLoading(false));
  }, [token]);

  async function signIn(email: string, password: string) {
    const response = await loginRequest({ email, password });
    saveToken(response.access_token);
    setToken(response.access_token);
  }

  function signOut() {
    removeToken();
    setToken(null);
    setUser(null);
  }

  const value = useMemo(
    () => ({ user, token, isLoading, signIn, signOut }),
    [user, token, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth deve ser usado dentro de AuthProvider.");
  return context;
}
