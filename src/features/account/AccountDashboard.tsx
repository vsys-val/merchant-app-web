import { useEffect, useState } from "react";
import { ApiError } from "../../lib/api";
import { useAuth } from "../auth/AuthContext";
import { Page, ProductPublic } from "../products/product-api";
import { getOwnProducts, getOwnReviews, OwnReview } from "./account-api";
import "./account.css";

type Tab = "reviews" | "products";

const intentLabels = { yes: "Compraria novamente", maybe: "Talvez comprasse", no: "Não compraria" };
const qualityLabels = { high: "Qualidade alta", adequate: "Qualidade adequada", low: "Qualidade baixa" };

export function AccountDashboard({
  onBack,
  onSelectProduct,
}: {
  onBack(): void;
  onSelectProduct(productId: number): void;
}) {
  const { token, user } = useAuth();
  const [tab, setTab] = useState<Tab>("reviews");
  const [reviews, setReviews] = useState<Page<OwnReview> | null>(null);
  const [products, setProducts] = useState<Page<ProductPublic> | null>(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    setError("");
    if (tab === "reviews") {
      setReviews(null);
      getOwnReviews(token, page).then(setReviews).catch(handleError);
    } else {
      setProducts(null);
      getOwnProducts(token, page).then(setProducts).catch(handleError);
    }
  }, [tab, page, token]);

  function handleError(caught: unknown) {
    setError(caught instanceof ApiError ? caught.message : "Não foi possível carregar sua área.");
  }

  function changeTab(nextTab: Tab) {
    setTab(nextTab);
    setPage(1);
  }

  if (!user || !token) {
    return <section className="accountState"><p>Sua sessão não está disponível.</p><button className="backButton" onClick={onBack}>Voltar ao início</button></section>;
  }

  const current = tab === "reviews" ? reviews : products;
  const lastPage = current ? Math.max(1, Math.ceil(current.total / current.page_size)) : 1;

  return (
    <section className="accountPage">
      <button className="backButton" type="button" onClick={onBack}>← Voltar ao início</button>
      <header className="accountHeading">
        <p className="eyebrow">Sua memória de compras</p>
        <h1>Olá, {user.name}.</h1>
        <p>Aqui ficam os produtos que você cadastrou e as experiências que registrou.</p>
      </header>

      <div className="accountTabs" role="tablist" aria-label="Minha área">
        <button role="tab" aria-selected={tab === "reviews"} className={tab === "reviews" ? "active" : ""} onClick={() => changeTab("reviews")}>Minhas avaliações</button>
        <button role="tab" aria-selected={tab === "products"} className={tab === "products" ? "active" : ""} onClick={() => changeTab("products")}>Meus produtos</button>
      </div>

      {error && <p className="formError" role="alert">{error}</p>}
      {!error && !current && <div className="accountState" aria-live="polite">Carregando seus registros…</div>}

      {tab === "reviews" && reviews && (
        reviews.items.length === 0 ? <Empty text="Você ainda não avaliou nenhum produto." /> :
        <div className="accountList">
          {reviews.items.map((review) => (
            <article className="accountCard" key={review.id}>
              <button type="button" onClick={() => onSelectProduct(review.product.id)}>
                <div className="accountCardTop"><span>{review.product.category.replaceAll("_", " ")}</span><time dateTime={review.updated_at}>{new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(new Date(review.updated_at))}</time></div>
                <h2>{review.product.name}</h2>
                <p>{review.product.brand}{review.product.variant ? ` · ${review.product.variant}` : ""}</p>
                <div className="accountTags"><span>{intentLabels[review.repurchase_intent]}</span><span>{qualityLabels[review.quality]}</span></div>
                {review.comment && <blockquote>“{review.comment}”</blockquote>}
                <strong className="accountOpen">Abrir produto →</strong>
              </button>
            </article>
          ))}
        </div>
      )}

      {tab === "products" && products && (
        products.items.length === 0 ? <Empty text="Você ainda não cadastrou nenhum produto." /> :
        <div className="accountList accountList--products">
          {products.items.map((product) => (
            <article className="accountCard" key={product.id}>
              <button type="button" onClick={() => onSelectProduct(product.id)}>
                <div className="accountCardTop"><span>{product.category.replaceAll("_", " ")}</span><span>{product.quantity} {product.unit}</span></div>
                <h2>{product.name}</h2>
                <p>{product.brand}{product.variant ? ` · ${product.variant}` : ""}</p>
                {product.barcode && <small>GTIN {product.barcode}</small>}
                <strong className="accountOpen">Abrir produto →</strong>
              </button>
            </article>
          ))}
        </div>
      )}

      {current && lastPage > 1 && (
        <div className="pagination">
          <button disabled={page === 1} onClick={() => setPage((value) => value - 1)}>Anterior</button>
          <span>Página {page} de {lastPage}</span>
          <button disabled={page === lastPage} onClick={() => setPage((value) => value + 1)}>Próxima</button>
        </div>
      )}
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="emptyState accountEmpty"><strong>Nada por aqui ainda.</strong><span>{text}</span></div>;
}
