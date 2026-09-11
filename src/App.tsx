import { useEffect, useState } from "react";
import { AccountDashboard } from "./features/account/AccountDashboard";
import { AuthPanel } from "./features/auth/AuthPanel";
import { useAuth } from "./features/auth/AuthContext";
import { ProductDetailView } from "./features/products/ProductDetailView";
import { ProductForm } from "./features/products/ProductForm";
import { ProductSearch } from "./features/products/ProductSearch";
import { ApiStatus, checkApiHealth } from "./lib/api";
import { useRouter } from "./lib/router";

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

  function goHome() {
    navigate("/");
  }

  function openProduct(productId: number) {
    navigate(`/products/${productId}`);
  }

  const protectedRoute = route.name === "account" || route.name === "create-product";

  return (
    <main>
      <header className="topbar">
        <button className="brand brandButton" type="button" onClick={goHome} aria-label="Merchant App — início"><span className="brandMark">M</span><span>Merchant</span></button>
        <nav className="accountNav" aria-label="Conta">
          {user && <button className="loginButton" type="button" onClick={() => navigate("/account")}>Minha área</button>}
          {user && <button className="loginButton createButton" type="button" onClick={() => navigate("/products/new")}>Cadastrar produto</button>}
          {isLoading ? <span className="accountLoading">Carregando conta…</span> : user ? (
            <><span>Olá, {user.name}</span><button className="loginButton" type="button" onClick={() => { signOut(); goHome(); }}>Sair</button></>
          ) : <button className="loginButton" type="button" onClick={() => setShowAuth(true)}>Entrar</button>}
        </nav>
      </header>

      {isLoading && protectedRoute ? <section className="accountState">Verificando sua sessão…</section> :
       protectedRoute && !user ? <ProtectedPrompt onBack={goHome} onLogin={() => setShowAuth(true)} /> :
       route.name === "account" && user ? <AccountDashboard onBack={goHome} onSelectProduct={openProduct} /> :
       route.name === "create-product" && user ? <ProductForm onCancel={goHome} onCreated={openProduct} /> :
       route.name === "product" ? <ProductDetailView productId={route.productId} onBack={goHome} /> : (
        <>
          <section className="hero">
            <div className="eyebrow">Escolhas melhores no mercado</div>
            <h1>Antes de colocar no carrinho, descubra se vale repetir.</h1>
            <p className="lead">Consulte avaliações objetivas de produtos e registre o que você compraria — ou evitaria — novamente.</p>
            <div className="apiStatus" aria-live="polite"><span className={`statusDot statusDot--${status}`} />{status === "checking" && "Verificando conexão com a API"}{status === "online" && "API conectada"}{status === "offline" && "API temporariamente indisponível"}</div>
          </section>
          <ProductSearch onSelect={openProduct} />
          <section className="steps" aria-labelledby="how-title">
            <div><p className="sectionNumber">02</p><h2 id="how-title">Como funciona</h2></div>
            <ol><li><strong>Encontre</strong><span>Pesquise pelo nome, marca ou código de barras.</span></li><li><strong>Compare</strong><span>Veja a experiência de quem já comprou.</span></li><li><strong>Registre</strong><span>Guarde sua avaliação para a próxima compra.</span></li></ol>
          </section>
        </>
      )}
      {showAuth && <AuthPanel onClose={() => setShowAuth(false)} />}
    </main>
  );
}

function ProtectedPrompt({ onBack, onLogin }: { onBack(): void; onLogin(): void }) {
  return <section className="accountState"><p>Entre na sua conta para acessar esta página.</p><div className="protectedActions"><button className="secondaryButton" type="button" onClick={onBack}>Voltar</button><button className="primaryButton" type="button" onClick={onLogin}>Entrar</button></div></section>;
}
