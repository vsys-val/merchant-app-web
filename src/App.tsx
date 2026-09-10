import { useEffect, useState } from "react";
import { AuthPanel } from "./features/auth/AuthPanel";
import { useAuth } from "./features/auth/AuthContext";
import { ProductSearch } from "./features/products/ProductSearch";
import { ApiStatus, checkApiHealth } from "./lib/api";

export function App() {
  const [status, setStatus] = useState<ApiStatus>("checking");
  const [showAuth, setShowAuth] = useState(false);
  const { user, isLoading, signOut } = useAuth();

  useEffect(() => {
    const controller = new AbortController();
    checkApiHealth(controller.signal).then((online) => {
      setStatus(online ? "online" : "offline");
    });
    return () => controller.abort();
  }, []);

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="/" aria-label="Merchant App — início">
          <span className="brandMark">M</span>
          <span>Merchant</span>
        </a>
        <nav className="accountNav" aria-label="Conta">
          {isLoading ? (
            <span className="accountLoading">Carregando conta…</span>
          ) : user ? (
            <>
              <span>Olá, {user.name}</span>
              <button className="loginButton" type="button" onClick={signOut}>Sair</button>
            </>
          ) : (
            <button className="loginButton" type="button" onClick={() => setShowAuth(true)}>
              Entrar
            </button>
          )}
        </nav>
      </header>

      <section className="hero">
        <div className="eyebrow">Escolhas melhores no mercado</div>
        <h1>Antes de colocar no carrinho, descubra se vale repetir.</h1>
        <p className="lead">
          Consulte avaliações objetivas de produtos e registre o que você
          compraria — ou evitaria — novamente.
        </p>
        <div className="apiStatus" aria-live="polite">
          <span className={`statusDot statusDot--${status}`} />
          {status === "checking" && "Verificando conexão com a API"}
          {status === "online" && "API conectada"}
          {status === "offline" && "API temporariamente indisponível"}
        </div>
      </section>

      <ProductSearch />

      <section className="steps" aria-labelledby="how-title">
        <div>
          <p className="sectionNumber">02</p>
          <h2 id="how-title">Como funciona</h2>
        </div>
        <ol>
          <li><strong>Encontre</strong><span>Pesquise pelo nome, marca ou código de barras.</span></li>
          <li><strong>Compare</strong><span>Veja a experiência de quem já comprou.</span></li>
          <li><strong>Registre</strong><span>Guarde sua avaliação para a próxima compra.</span></li>
        </ol>
      </section>

      {showAuth && <AuthPanel onClose={() => setShowAuth(false)} />}
    </main>
  );
}
