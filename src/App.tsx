import { useEffect, useState } from "react";
import { AccountDashboard } from "./features/account/AccountDashboard";
import { AuthPanel } from "./features/auth/AuthPanel";
import { useAuth } from "./features/auth/AuthContext";
import { ProductDetailView } from "./features/products/ProductDetailView";
import { ProductForm } from "./features/products/ProductForm";
import { ProductSearch } from "./features/products/ProductSearch";
import { ApiStatus, checkApiHealth } from "./lib/api";

type View = "home" | "create" | "account";

export function App() {
  const [status, setStatus] = useState<ApiStatus>("checking");
  const [showAuth, setShowAuth] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [view, setView] = useState<View>("home");
  const { user, isLoading, signOut } = useAuth();

  useEffect(() => {
    const controller = new AbortController();
    checkApiHealth(controller.signal).then((online) => setStatus(online ? "online" : "offline"));
    return () => controller.abort();
  }, []);

  function goHome() {
    setView("home"); setSelectedProductId(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function openProduct(productId: number) {
    setView("home"); setSelectedProductId(productId);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function openView(nextView: View) {
    setSelectedProductId(null); setView(nextView);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <main>
      <header className="topbar">
        <button className="brand brandButton" type="button" onClick={goHome} aria-label="Merchant App — início"><span className="brandMark">M</span><span>Merchant</span></button>
        <nav className="accountNav" aria-label="Conta">
          {user && <button className="loginButton" type="button" onClick={() => openView("account")}>Minha área</button>}
          {user && <button className="loginButton createButton" type="button" onClick={() => openView("create")}>Cadastrar produto</button>}
          {isLoading ? <span className="accountLoading">Carregando conta…</span> : user ? (
            <><span>Olá, {user.name}</span><button className="loginButton" type="button" onClick={() => { signOut(); goHome(); }}>Sair</button></>
          ) : <button className="loginButton" type="button" onClick={() => setShowAuth(true)}>Entrar</button>}
        </nav>
      </header>

      {view === "account" && user ? <AccountDashboard onBack={goHome} onSelectProduct={openProduct} /> :
       view === "create" && user ? <ProductForm onCancel={goHome} onCreated={openProduct} /> :
       selectedProductId ? <ProductDetailView productId={selectedProductId} onBack={goHome} /> : (
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
