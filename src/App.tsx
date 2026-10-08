import { useEffect, useState, type ReactNode } from "react";
import { CheckCircle, ClockCounterClockwise, House, MagnifyingGlass, MinusCircle, Package, UserCircle, XCircle } from "@phosphor-icons/react";
import { AccountDashboard } from "./features/account/AccountDashboard";
import { AdminDashboard } from "./features/admin/AdminDashboard";
import { getOwnReviews, OwnReview } from "./features/account/account-api";
import { AuthPanel } from "./features/auth/AuthPanel";
import { useAuth } from "./features/auth/AuthContext";
import { ProductDetailView } from "./features/products/ProductDetailView";
import { ProductEditView } from "./features/products/ProductEditView";
import { ProductForm } from "./features/products/ProductForm";
import { ProductAttribution } from "./features/products/ProductAttribution";
import { ProductImage } from "./features/products/ProductImage";
import { ProductSearch } from "./features/products/ProductSearch";
import { ApiStatus, checkApiHealth } from "./lib/api";
import { Route, useRouter } from "./lib/router";

export function App() {
  const [status, setStatus] = useState<ApiStatus>("checking");
  const [showAuth, setShowAuth] = useState(false);
  // Última busca, para voltar a ela a partir do produto ou da navegação.
  const [lastSearch, setLastSearch] = useState("");
  const [signOutError, setSignOutError] = useState("");
  const [isSigningOut, setIsSigningOut] = useState(false);
  const { user, isLoading, signOut } = useAuth();
  const { route, navigate } = useRouter();

  useEffect(() => {
    const controller = new AbortController();
    checkApiHealth(controller.signal).then((online) => setStatus(online ? "online" : "offline"));
    return () => controller.abort();
  }, []);

  const goHome = () => navigate("/");
  const goSearch = () => navigate(`/search${lastSearch}`);
  const openProduct = (productId: number) => navigate(`/products/${productId}`);
  const protectedRoute = route.name === "account" || route.name === "create-product" || route.name === "edit-product" || route.name === "admin";

  async function handleSignOut() {
    if (isSigningOut) return;
    setIsSigningOut(true);
    setSignOutError("");
    try {
      await signOut();
      goHome();
    } catch {
      setSignOutError("Não foi possível sair da conta. Verifique sua conexão e tente novamente.");
    } finally {
      setIsSigningOut(false);
    }
  }

  // O painel ocupa a tela inteira, fora da coluna do app.
  if (route.name === "admin") {
    return (
      <>
        {isLoading ? <main className="adminPage adminState" aria-live="polite">Verificando sua sessão…</main>
          : user ? <AdminDashboard onBack={goHome} />
          : <main className="adminPage adminState"><p>Entre com uma conta de administração.</p><button className="primaryButton" type="button" onClick={() => setShowAuth(true)}>Entrar</button></main>}
        {showAuth && <AuthPanel onClose={() => setShowAuth(false)} />}
      </>
    );
  }

  return (
    <div className="appViewport">
      <div className="appShell">
        <TopNavigation route={route} navigate={navigate} goSearch={goSearch} userName={user?.name ?? null} openAccount={() => user ? navigate("/account") : setShowAuth(true)} />
        {route.name === "home" && (
          <header className="homeHeader">
            <button className="wordmark" type="button" onClick={goHome} aria-label="Merchant — início">
              Merchant<span>Suas compras, uma memória melhor</span>
            </button>
            <button className="avatarButton" type="button" onClick={() => user ? navigate("/account") : setShowAuth(true)} aria-label={user ? "Abrir minha área" : "Entrar"}>
              <UserCircle size={42} weight="fill" />
            </button>
          </header>
        )}

        <main className="appContent">
          {isLoading && protectedRoute ? <PageState>Verificando sua sessão…</PageState> :
           protectedRoute && !user ? <ProtectedPrompt onBack={goHome} onLogin={() => setShowAuth(true)} /> :
           route.name === "home" ? <HomeView key={user?.id ?? "visitor"} status={status} onSearch={() => navigate("/search")} onProduct={openProduct} onLogin={() => setShowAuth(true)} /> :
           route.name === "search" ? <ProductSearch key={user?.id ?? "visitor"} onBack={goHome} onSelect={openProduct} onCreate={() => user ? navigate("/products/new") : setShowAuth(true)} onQueryChange={setLastSearch} /> :
           route.name === "account" && user ? <AccountDashboard onBack={goHome} onSelectProduct={openProduct} onEditProduct={(productId) => navigate(`/products/${productId}/edit`)} onOpenAdmin={() => navigate("/admin")} /> :
           route.name === "create-product" && user ? <ProductForm onCancel={goSearch} onSaved={openProduct} onOpenExisting={openProduct} /> :
           route.name === "edit-product" && user ? <ProductEditView productId={route.productId} onBack={() => navigate("/account")} onSaved={openProduct} onOpenExisting={openProduct} /> :
           route.name === "product" ? <ProductDetailView productId={route.productId} onBack={goSearch} /> : null}
        </main>

        {route.name !== "create-product" && route.name !== "edit-product" && <BottomNavigation route={route} navigate={navigate} goSearch={goSearch} requireAccount={() => user ? navigate("/account") : setShowAuth(true)} />}
      </div>
      {user && route.name === "account" && <div>{signOutError && <p role="alert">{signOutError}</p>}<button className="signOutButton" type="button" disabled={isSigningOut} onClick={() => void handleSignOut()}>{isSigningOut ? "Saindo…" : "Sair da conta"}</button></div>}
      {showAuth && <AuthPanel onClose={() => setShowAuth(false)} />}
    </div>
  );
}

function HomeView({ status, onSearch, onProduct, onLogin }: { status: ApiStatus; onSearch(): void; onProduct(id: number): void; onLogin(): void }) {
  const { user } = useAuth();
  const userId = user?.id;
  const [reviews, setReviews] = useState<OwnReview[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setReviews(null);
    setError("");
    if (!userId) return;
    getOwnReviews(1).then((page) => { if (active) setReviews(page.items.slice(0, 3)); }).catch(() => { if (active) setError("Não foi possível carregar suas avaliações agora."); });
    return () => { active = false; };
  }, [userId]);

  return <div className="homeLayout">
    <div className="homeSearch">
    <button className="searchLaunch" type="button" onClick={onSearch}><MagnifyingGlass size={27} /><span>Busque produto, marca ou código</span></button>
    <div className={`connectionStatus connectionStatus--${status}`} aria-live="polite"><span />{status === "checking" ? "Conectando…" : status === "online" ? "Catálogo conectado" : "Catálogo temporariamente indisponível"}</div>
    </div>
    {user ? <>
      <section className="memorySection">
        <h1>Lembrete para você</h1><p>Com base nas suas experiências anteriores</p>
        {error && <p className="formError" role="alert">{error}</p>}
        {!error && reviews === null && <PageState>Carregando suas lembranças…</PageState>}
        {reviews?.length === 0 && <EmptyMemory onSearch={onSearch} />}
        {reviews?.[0] && <MemoryRow review={reviews[0]} onSelect={onProduct} />}
      </section>
      {reviews && reviews.length > 1 && <section className="memorySection recentSection">
        <h2>Avaliações recentes</h2><p>Produtos que você já avaliou</p>
        {reviews.slice(1).map((review) => <MemoryRow key={review.id} review={review} onSelect={onProduct} />)}
      </section>}
    </> : <section className="visitorWelcome">
      <Package size={43} weight="duotone" /><h1>Lembre do que vale comprar de novo.</h1>
      <p>Consulte o catálogo e entre para registrar suas experiências.</p>
      <button className="primaryButton" type="button" onClick={onLogin}>Entrar na minha conta</button>
    </section>}
  </div>;
}

function MemoryRow({ review, onSelect }: { review: OwnReview; onSelect(id: number): void }) {
  const [failedPhotoUrl, setFailedPhotoUrl] = useState<string | null>(null);
  const intent = review.repurchase_intent;
  const Icon = intent === "yes" ? CheckCircle : intent === "no" ? XCircle : MinusCircle;
  const label = intent === "yes" ? "Você compraria novamente" : intent === "no" ? "Você não compraria novamente" : "Talvez compraria novamente";
  return <div><button className="memoryRow" type="button" onClick={() => onSelect(review.product.id)}>
    <ProductImage product={review.product} size="thumb" onImageError={() => setFailedPhotoUrl(review.product.image_url ?? null)} />
    <span className="memoryCopy"><strong>{review.product.name}</strong><span>{review.product.brand} · {review.product.quantity} {review.product.unit}</span><span className={`intentBadge intentBadge--${intent}`}><Icon size={21} weight="fill" />{label}</span>{review.comment && <span className="memoryComment">{review.comment}</span>}</span>
  </button>{failedPhotoUrl !== review.product.image_url && <ProductAttribution product={review.product} variant="compact" />}</div>;
}

function EmptyMemory({ onSearch }: { onSearch(): void }) {
  return <div className="emptyState"><strong>Suas experiências vão aparecer aqui.</strong><span>Encontre um produto que você já experimentou.</span><button className="primaryButton" onClick={onSearch}>Buscar produto</button></div>;
}

const navItems = [
  { key: "home", label: "Início", icon: House },
  { key: "search", label: "Buscar", icon: MagnifyingGlass },
  { key: "account", label: "Minhas avaliações", icon: ClockCounterClockwise },
] as const;

function activeSection(route: Route): string {
  return route.name === "product" || route.name === "create-product" ? "search" : route.name === "edit-product" ? "account" : route.name;
}

/** Navegação do desktop: marca, destinos principais e conta no topo da página. */
function TopNavigation({ route, navigate, goSearch, userName, openAccount }: { route: Route; navigate(path: string): void; goSearch(): void; userName: string | null; openAccount(): void }) {
  const actions: Record<string, () => void> = { home: () => navigate("/"), search: goSearch, account: openAccount };
  const active = activeSection(route);
  return (
    <header className="topNavigation">
      <button className="topBrand" type="button" onClick={() => navigate("/")} aria-label="Merchant — início">Merchant<span>Suas compras, uma memória melhor</span></button>
      <nav aria-label="Navegação principal">
        {navItems.map(({ key, label, icon: Icon }) => <button key={key} type="button" className={active === key ? "active" : ""} aria-current={active === key ? "page" : undefined} onClick={actions[key]}><Icon size={20} /><span>{label}</span></button>)}
      </nav>
      <button className="topAccount" type="button" onClick={openAccount}><UserCircle size={30} weight="fill" /><span>{userName ?? "Entrar"}</span></button>
    </header>
  );
}

function BottomNavigation({ route, navigate, goSearch, requireAccount }: { route: Route; navigate(path: string): void; goSearch(): void; requireAccount(): void }) {
  const actions: Record<string, () => void> = { home: () => navigate("/"), search: goSearch, account: requireAccount };
  const active = activeSection(route);
  return <nav className="bottomNavigation" aria-label="Navegação principal">{navItems.map(({ key, label, icon: Icon }) => <button key={key} type="button" className={active === key ? "active" : ""} aria-current={active === key ? "page" : undefined} onClick={actions[key]}><Icon size={27} /><span>{label}</span></button>)}</nav>;
}

function PageState({ children }: { children: ReactNode }) { return <section className="pageState" aria-live="polite">{children}</section>; }

function ProtectedPrompt({ onBack, onLogin }: { onBack(): void; onLogin(): void }) {
  return <section className="pageState"><p>Entre na sua conta para acessar esta página.</p><div className="protectedActions"><button className="secondaryButton" type="button" onClick={onBack}>Voltar</button><button className="primaryButton" type="button" onClick={onLogin}>Entrar</button></div></section>;
}
