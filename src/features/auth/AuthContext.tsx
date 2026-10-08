import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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

  const requestVersion = useRef(0);
  // Cookie mutations must reach the server in order (login cannot finish after logout).
  const mutationQueue = useRef<Promise<void>>(Promise.resolve());
  const enqueueMutation = useCallback((operation: () => Promise<void>) => {
    const pending = mutationQueue.current.catch(() => undefined).then(operation);
    mutationQueue.current = pending;
    return pending;
  }, []);

  useEffect(() => {
    const version = ++requestVersion.current;
    let active = true;
    migrateLegacyToken()
      .then(loadUser)
      .then((loaded) => {
        if (active && version === requestVersion.current) setUser(loaded);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const refreshUser = useCallback(async () => {
    const version = ++requestVersion.current;
    const loaded = await getCurrentUser();
    if (version === requestVersion.current) setUser(loaded);
  }, []);

  const signIn = useCallback((email: string, password: string) => {
    requestVersion.current += 1;
    return enqueueMutation(async () => {
      const version = ++requestVersion.current;
      await loginRequest({ email, password });
      const loaded = await getCurrentUser();
      if (version === requestVersion.current) setUser(loaded);
    });
  }, [enqueueMutation]);

  const signOut = useCallback(() => {
    requestVersion.current += 1;
    return enqueueMutation(async () => {
      // Keep the account visible unless the server confirms that its cookie is revoked.
      await logoutRequest();
      // Invalidate reads started while logout was in flight as well.
      requestVersion.current += 1;
      setUser(null);
    });
  }, [enqueueMutation]);

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
