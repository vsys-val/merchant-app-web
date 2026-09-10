import { FormEvent, useEffect, useState } from "react";
import { ApiStatus, checkApiHealth } from "./lib/api";

export function App() {
  const [status, setStatus] = useState<ApiStatus>("checking");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    checkApiHealth(controller.signal).then((online) => {
      setStatus(online ? "online" : "offline");
    });

    return () => controller.abort();
  }, []);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!search.trim()) return;
    // A navegação para os resultados será adicionada na próxima entrega.
  }

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="/" aria-label="Merchant App — início">
          <span className="brandMark">M</span>
          <span>Merchant</span>
        </a>
        <button className="loginButton" type="button">Entrar</button>
      </header>

      <section className="hero">
        <div className="eyebrow">Escolhas melhores no mercado</div>
        <h1>Antes de colocar no carrinho, descubra se vale repetir.</h1>
        <p className="lead">
          Consulte avaliações objetivas de produtos e registre o que você
          compraria — ou evitaria — novamente.
        </p>

        <form className="search" onSubmit={handleSearch}>
          <label htmlFor="product-search">Busque por produto ou marca</label>
          <div className="searchRow">
            <input
              id="product-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Ex.: café, biscoito, marca..."
            />
            <button type="submit">Buscar</button>
          </div>
        </form>

        <div className="apiStatus" aria-live="polite">
          <span className={`statusDot statusDot--${status}`} />
          {status === "checking" && "Verificando conexão com a API"}
          {status === "online" && "API conectada"}
          {status === "offline" && "API temporariamente indisponível"}
        </div>
      </section>

      <section className="steps" aria-labelledby="how-title">
        <div>
          <p className="sectionNumber">01</p>
          <h2 id="how-title">Como funciona</h2>
        </div>
        <ol>
          <li><strong>Encontre</strong><span>Pesquise pelo nome, marca ou código de barras.</span></li>
          <li><strong>Compare</strong><span>Veja a experiência de quem já comprou.</span></li>
          <li><strong>Registre</strong><span>Guarde sua avaliação para a próxima compra.</span></li>
        </ol>
      </section>
    </main>
  );
}
