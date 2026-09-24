import { useEffect, useState, type ReactNode } from "react";
import { CheckCircle, ClockCounterClockwise, House, MagnifyingGlass, MinusCircle, Package, UserCircle, XCircle } from "@phosphor-icons/react";
import { AccountDashboard } from "./features/account/AccountDashboard";
import { getOwnReviews, OwnReview } from "./features/account/account-api";
import { AuthPanel } from "./features/auth/AuthPanel";
import { useAuth } from "./features/auth/AuthContext";
import { ProductDetailView } from "./features/products/ProductDetailView";
import { ProductForm } from "./features/products/ProductForm";
import { ProductSearch } from "./features/products/ProductSearch";
import { ApiStatus, checkApiHealth } from "./lib/api";
import { Route, useRouter } from "./lib/router";

export function App() {
  const [status, setStatus] = useState<ApiStatus>("checking");
  const [showAuth, setShowAuth] = useState(false);
  const { user, isLoading, signOut } = useAuth();
  const { route, navigate } = useRouter();

  useEffect(() => {
    const controller = new AbortController();
    checkApiHealth(controller.signal).then((online) => setStatus(online ? "online" : "offline"));
    return () => controller.abort();
  }, []);

  const goHome = () => navigate("/");
  const openProduct = (productId: number) => navigate(`/products/${productId}`);
  const protectedRoute = route.name === "account" || route.name === "create-product";

  return (
    <div className="appViewport">
      <div className="appShell">
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
           route.name === "home" ? <HomeView status={status} onSearch={() => navigate("/search")} onProduct={openProduct} onLogin={() => setShowAuth(true)} /> :
           route.name === "search" ? <ProductSearch onBack={goHome} onSelect={openProduct} onCreate={() => user ? navigate("/products/new") : setShowAuth(true)} /> :
           route.name === "account" && user ? <AccountDashboard onBack={goHome} onSelectProduct={openProduct} /> :
           route.name === "create-product" && user ? <ProductForm onCancel={() => navigate("/search")} onCreated={openProduct} onOpenExisting={openProduct} /> :
           route.name === "product" ? <ProductDetailView productId={route.productId} onBack={() => navigate("/search")} /> : null}
        </main>

        {route.name !== "create-product" && <BottomNavigation route={route} navigate={navigate} requireAccount={() => user ? navigate("/account") : setShowAuth(true)} />}
      </div>
      {user && route.name === "account" && <button className="signOutButton" type="button" onClick={() => { signOut(); goHome(); }}>Sair da conta</button>}
      {showAuth && <AuthPanel onClose={() => setShowAuth(false)} />}
    </div>
  );
}

function HomeView({ status, onSearch, onProduct, onLogin }: { status: ApiStatus; onSearch(): void; onProduct(id: number): void; onLogin(): void }) {
  const { user, token } = useAuth();
  const [reviews, setReviews] = useState<OwnReview[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) { setReviews(null); return; }
    getOwnReviews(token, 1).then((page) => setReviews(page.items.slice(0, 3))).catch(() => setError("Não foi possível carregar suas avaliações agora."));
  }, [token]);

  return <>
    <button className="searchLaunch" type="button" onClick={onSearch}><MagnifyingGlass size={27} /><span>Busque produto, marca ou código</span></button>
    <div className={`connectionStatus connectionStatus--${status}`} aria-live="polite"><span />{status === "checking" ? "Conectando…" : status === "online" ? "Catálogo conectado" : "Catálogo temporariamente indisponível"}</div>
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
  </>;
}

function MemoryRow({ review, onSelect }: { review: OwnReview; onSelect(id: number): void }) {
  const intent = review.repurchase_intent;
  const Icon = intent === "yes" ? CheckCircle : intent === "no" ? XCircle : MinusCircle;
  const label = intent === "yes" ? "Você compraria novamente" : intent === "no" ? "Você não compraria novamente" : "Talvez compraria novamente";
  return <button className="memoryRow" type="button" onClick={() => onSelect(review.product.id)}>
    <span className="productPlaceholder"><Package size={34} weight="duotone" /></span>
    <span className="memoryCopy"><strong>{review.product.name}</strong><span>{review.product.brand} · {review.product.quantity} {review.product.unit}</span><span className={`intentBadge intentBadge--${intent}`}><Icon size={21} weight="fill" />{label}</span>{review.comment && <span className="memoryComment">{review.comment}</span>}</span>
  </button>;
}

function EmptyMemory({ onSearch }: { onSearch(): void }) {
  return <div className="emptyState"><strong>Suas experiências vão aparecer aqui.</strong><span>Encontre um produto que você já experimentou.</span><button className="primaryButton" onClick={onSearch}>Buscar produto</button></div>;
}

function BottomNavigation({ route, navigate, requireAccount }: { route: Route; navigate(path: string): void; requireAccount(): void }) {
  const items = [
    { key: "home", label: "Início", icon: House, action: () => navigate("/") },
    { key: "search", label: "Buscar", icon: MagnifyingGlass, action: () => navigate("/search") },
    { key: "account", label: "Minhas avaliações", icon: ClockCounterClockwise, action: requireAccount },
  ];
  const active = route.name === "product" || route.name === "create-product" ? "search" : route.name;
  return <nav className="bottomNavigation" aria-label="Navegação principal">{items.map(({ key, label, icon: Icon, action }) => <button key={key} type="button" className={active === key ? "active" : ""} aria-current={active === key ? "page" : undefined} onClick={action}><Icon size={27} /><span>{label}</span></button>)}</nav>;
}

function PageState({ children }: { children: ReactNode }) { return <section className="pageState" aria-live="polite">{children}</section>; }

function ProtectedPrompt({ onBack, onLogin }: { onBack(): void; onLogin(): void }) {
  return <section className="pageState"><p>Entre na sua conta para acessar esta página.</p><div className="protectedActions"><button className="secondaryButton" type="button" onClick={onBack}>Voltar</button><button className="primaryButton" type="button" onClick={onLogin}>Entrar</button></div></section>;
}
