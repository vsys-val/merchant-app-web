import { FormEvent, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { ApiError } from "../../lib/api";
import {
  ProductListItem,
  ProductPage,
  SearchField,
  searchProducts,
} from "./product-api";

const fieldLabels: Record<SearchField, string> = {
  name: "Produto",
  brand: "Marca",
  barcode: "Código de barras",
};

const intentLabels = {
  yes: "Compraria novamente",
  maybe: "Talvez comprasse",
  no: "Não compraria",
} as const;

export function ProductSearch() {
  const [field, setField] = useState<SearchField>("name");
  const [value, setValue] = useState("");
  const [result, setResult] = useState<ProductPage | null>(null);
  const [error, setError] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const { token } = useAuth();

  async function runSearch(page = 1) {
    if (!value.trim()) return;
    setError("");
    setIsSearching(true);
    try {
      setResult(await searchProducts({ field, value, page }, token));
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Não foi possível pesquisar agora.",
      );
    } finally {
      setIsSearching(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void runSearch();
  }

  function changeField(nextField: SearchField) {
    setField(nextField);
    setResult(null);
    setError("");
    setValue("");
  }

  return (
    <section className="productSearch" aria-labelledby="search-title">
      <div className="searchIntro">
        <p className="eyebrow">Catálogo comunitário</p>
        <h2 id="search-title">O que você está procurando?</h2>
      </div>

      <div className="searchModes" role="group" aria-label="Pesquisar por">
        {(Object.keys(fieldLabels) as SearchField[]).map((option) => (
          <button
            type="button"
            key={option}
            className={field === option ? "active" : ""}
            onClick={() => changeField(option)}
          >
            {fieldLabels[option]}
          </button>
        ))}
      </div>

      <form className="search" onSubmit={handleSubmit}>
        <label htmlFor="product-search">Digite {fieldLabels[field].toLowerCase()}</label>
        <div className="searchRow">
          <input
            id="product-search"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            minLength={field === "barcode" ? undefined : 2}
            inputMode={field === "barcode" ? "numeric" : "search"}
            placeholder={
              field === "barcode"
                ? "Ex.: 7891234567890"
                : field === "brand"
                  ? "Ex.: Kibon"
                  : "Ex.: sorvete de baunilha"
            }
            required
          />
          <button type="submit" disabled={isSearching}>
            {isSearching ? "Buscando..." : "Buscar"}
          </button>
        </div>
      </form>

      {error && <p className="searchError" role="alert">{error}</p>}
      {result && (
        <SearchResults
          result={result}
          disabled={isSearching}
          onPageChange={(page) => void runSearch(page)}
        />
      )}
    </section>
  );
}

function SearchResults({
  result,
  disabled,
  onPageChange,
}: {
  result: ProductPage;
  disabled: boolean;
  onPageChange(page: number): void;
}) {
  const lastPage = Math.max(1, Math.ceil(result.total / result.page_size));

  if (result.items.length === 0) {
    return (
      <div className="emptyState">
        <strong>Nenhum produto encontrado.</strong>
        <span>Tente outro termo ou pesquise por um campo diferente.</span>
      </div>
    );
  }

  return (
    <div className="results" aria-live="polite">
      <div className="resultsHeader">
        <strong>{result.total} {result.total === 1 ? "produto" : "produtos"}</strong>
        <span>Página {result.page} de {lastPage}</span>
      </div>
      <div className="productGrid">
        {result.items.map((product) => <ProductCard key={product.id} product={product} />)}
      </div>
      {lastPage > 1 && (
        <div className="pagination">
          <button type="button" disabled={disabled || result.page === 1} onClick={() => onPageChange(result.page - 1)}>
            Anterior
          </button>
          <button type="button" disabled={disabled || result.page === lastPage} onClick={() => onPageChange(result.page + 1)}>
            Próxima
          </button>
        </div>
      )}
    </div>
  );
}

function ProductCard({ product }: { product: ProductListItem }) {
  const distribution = product.community_summary.repurchase_intent;
  const leadingIntent = (Object.keys(distribution) as Array<keyof typeof distribution>)
    .reduce((best, current) => distribution[current] > distribution[best] ? current : best, "yes");

  return (
    <article className="productCard">
      <div className="productMeta">
        <span>{product.category.replaceAll("_", " ")}</span>
        <span>{product.quantity} {product.unit}</span>
      </div>
      <h3>{product.name}</h3>
      <p>{product.brand}{product.variant ? ` · ${product.variant}` : ""}</p>
      <div className="communitySignal">
        <strong>{product.community_summary.total_reviews}</strong>
        <span>{product.community_summary.total_reviews === 1 ? "avaliação" : "avaliações"}</span>
      </div>
      {product.community_summary.total_reviews > 0 && (
        <p className={`intent intent--${leadingIntent}`}>
          {intentLabels[leadingIntent]} · {distribution[leadingIntent].toFixed(0)}%
        </p>
      )}
    </article>
  );
}
