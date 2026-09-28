import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  exchangeLegacyToken,
  getCurrentUser,
  login as loginRequest,
  logout as logoutRequest,
  User,
} from "./auth-api";
import { readLegacyToken, removeLegacyToken } from "./auth-storage";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  signIn(email: string, password: string): Promise<void>;
  /** Recarrega a conta depois que a API abriu a sessão (por exemplo, ao confirmar o e-mail). */
  refreshUser(): Promise<void>;
  signOut(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function loadUser(): Promise<User | null> {
  try {
    return await getCurrentUser();
  } catch {
    return null;
  }
}

/** Abre a sessão em cookie para quem entrou antes da migração, sem pedir a senha de novo. */
async function migrateLegacyToken(): Promise<void> {
  const legacy = readLegacyToken();
  if (!legacy) return;
  // Sai do armazenamento antes da troca: o token não fica exposto nem é enviado duas vezes.
  removeLegacyToken();
  try {
    await exchangeLegacyToken(legacy);
  } catch {
    // Token expirado ou inválido: a pessoa só precisa entrar de novo.
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    migrateLegacyToken()
      .then(loadUser)
      .then((loaded) => {
        if (active) setUser(loaded);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const refreshUser = useCallback(async () => {
    setUser(await getCurrentUser());
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    await loginRequest({ email, password });
    setUser(await getCurrentUser());
  }, []);

  const signOut = useCallback(async () => {
    try {
      await logoutRequest();
    } catch {
      // Sem rede, o cookie expira sozinho; a interface sai da conta de qualquer forma.
    }
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, isLoading, signIn, refreshUser, signOut }),
    [user, isLoading, signIn, refreshUser, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth deve ser usado dentro de AuthProvider.");
  return context;
}
