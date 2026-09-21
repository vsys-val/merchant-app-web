import { FormEvent, useState } from "react";
import { ArrowLeft, CaretRight, MagnifyingGlass, Package, Plus } from "@phosphor-icons/react";
import { useAuth } from "../auth/AuthContext";
import { ApiError } from "../../lib/api";
import { getCategoryLabel } from "./category-labels";
import {
  ProductListItem,
  Page,
  SearchField,
  searchProducts,
} from "./product-api";
import "./products.css";

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

export function ProductSearch({ onBack, onSelect, onCreate }: { onBack(): void; onSelect(productId: number): void; onCreate(): void }) {
  const [field, setField] = useState<SearchField>("name");
  const [value, setValue] = useState("");
  const [result, setResult] = useState<Page<ProductListItem> | null>(null);
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
      setError(caught instanceof ApiError ? caught.message : "Não foi possível pesquisar agora.");
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
      <header className="pageHeader"><button type="button" aria-label="Voltar ao início" onClick={onBack}><ArrowLeft size={24} /></button><h1 id="search-title">Buscar</h1></header>
      <div className="searchModes" role="group" aria-label="Pesquisar por">
        {(Object.keys(fieldLabels) as SearchField[]).map((option) => (
          <button type="button" key={option} className={field === option ? "active" : ""} onClick={() => changeField(option)}>
            {fieldLabels[option]}
          </button>
        ))}
      </div>
      <form className="search" onSubmit={handleSubmit}>
        <label className="srOnly" htmlFor="product-search">Digite {fieldLabels[field].toLowerCase()}</label>
        <div className="searchRow">
          <MagnifyingGlass size={24} />
          <input
            id="product-search"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            minLength={field === "barcode" ? undefined : 2}
            inputMode={field === "barcode" ? "numeric" : "search"}
            placeholder={field === "barcode" ? "Ex.: 7891234567890" : field === "brand" ? "Ex.: Kibon" : "Ex.: sorvete de baunilha"}
            required
          />
          <button type="submit" disabled={isSearching} aria-label="Executar busca">{isSearching ? <span className="loadingLabel">Buscando...</span> : <CaretRight size={24} />}</button>
        </div>
      </form>
      {error && <p className="searchError" role="alert">{error}</p>}
      {result && (
        <SearchResults result={result} disabled={isSearching} onSelect={onSelect} onPageChange={(page) => void runSearch(page)} />
      )}
      <button className="primaryButton createProductAction" type="button" onClick={onCreate}><Plus size={20} />Cadastrar produto</button>
    </section>
  );
}

function SearchResults({
  result, disabled, onSelect, onPageChange,
}: {
  result: Page<ProductListItem>;
  disabled: boolean;
  onSelect(productId: number): void;
  onPageChange(page: number): void;
}) {
  const lastPage = Math.max(1, Math.ceil(result.total / result.page_size));
  if (result.items.length === 0) {
    return <div className="emptyState"><strong>Nenhum produto encontrado.</strong><span>Tente outro termo ou campo.</span></div>;
  }
  return (
    <div className="results" aria-live="polite">
      <div className="resultsHeader"><strong>Resultados</strong><span>{result.total} {result.total === 1 ? "produto" : "produtos"}</span></div>
      <div className="productGrid">
        {result.items.map((product) => <ProductCard key={product.id} product={product} onSelect={onSelect} />)}
      </div>
      {lastPage > 1 && (
        <div className="pagination">
          <button type="button" disabled={disabled || result.page === 1} onClick={() => onPageChange(result.page - 1)}>Anterior</button>
          <button type="button" disabled={disabled || result.page === lastPage} onClick={() => onPageChange(result.page + 1)}>Próxima</button>
        </div>
      )}
    </div>
  );
}

function ProductCard({ product, onSelect }: { product: ProductListItem; onSelect(productId: number): void }) {
  const distribution = product.community_summary.repurchase_intent;
  const leadingIntent = (Object.keys(distribution) as Array<keyof typeof distribution>)
    .reduce((best, current) => distribution[current] > distribution[best] ? current : best, "yes");
  return (
    <article className="productCard">
      <button className="productCardLink" type="button" onClick={() => onSelect(product.id)} aria-label={`Ver detalhes de ${product.name}`}>
        <span className="productPlaceholder"><Package size={34} weight="duotone" /></span>
        <span className="productCardCopy"><strong>{product.name}</strong><span>{product.brand}{product.variant ? ` · ${product.variant}` : ""} · {product.quantity} {product.unit}</span><span className="productCategory">{getCategoryLabel(product.category)}</span>{product.your_repurchase_intent ? <span className={`intent intent--${product.your_repurchase_intent}`}>{intentLabels[product.your_repurchase_intent]}</span> : product.community_summary.total_reviews > 0 ? <span className={`intent intent--${leadingIntent}`}>{intentLabels[leadingIntent]} · {distribution[leadingIntent].toFixed(0)}%</span> : <span className="unreviewed">Ainda sem avaliações</span>}</span>
        <CaretRight size={19} />
      </button>
    </article>
  );
}
