import { FormEvent, useEffect, useRef, useState } from "react";
import { ArrowLeft, CaretRight, MagnifyingGlass, Package, Plus } from "@phosphor-icons/react";
import { useAuth } from "../auth/AuthContext";
import { ApiError } from "../../lib/api";
import { track } from "../../lib/analytics";
import { categoryLabels, getCategoryLabel } from "./category-labels";
import {
  Category,
  filtersToParams,
  ProductFilters,
  ProductListItem,
  SearchPage,
  searchProducts,
} from "./product-api";
import "./products.css";

type Mode = "text" | "barcode";

const intentLabels = {
  yes: "Compraria novamente",
  maybe: "Talvez comprasse",
  no: "Não compraria",
} as const;

const categories = Object.keys(categoryLabels) as Category[];

/** Lê os filtros da URL, ignorando valores que a API recusaria. */
export function parseSearchQuery(search: string): { filters: ProductFilters; page: number } | null {
  const params = new URLSearchParams(search);
  const category = params.get("category");
  const filters: ProductFilters = {
    name: params.get("name") ?? undefined,
    brand: params.get("brand") ?? undefined,
    category: category && category in categoryLabels ? (category as Category) : undefined,
    barcode: params.get("barcode") ?? undefined,
  };
  const hasFilter = Object.values(filters).some(Boolean);
  const page = Math.max(1, Number.parseInt(params.get("page") ?? "1", 10) || 1);
  return hasFilter || params.has("all") ? { filters, page } : null;
}

function validate(filters: ProductFilters): string {
  if (filters.barcode !== undefined) {
    return /^\d{8}$|^\d{12,14}$/.test(filters.barcode.trim())
      ? ""
      : "O código de barras deve ter 8, 12, 13 ou 14 números.";
  }
  for (const [field, label] of [["name", "o nome"], ["brand", "a marca"]] as const) {
    const value = filters[field]?.trim();
    if (value && value.length < 2) return `Digite pelo menos 2 letras para ${label}.`;
  }
  return "";
}

function describeFilters(filters: ProductFilters): string {
  if (filters.barcode?.trim()) return `código ${filters.barcode.trim()}`;
  const parts: string[] = [];
  if (filters.name?.trim()) parts.push(`“${filters.name.trim()}”`);
  if (filters.brand?.trim()) parts.push(`marca “${filters.brand.trim()}”`);
  if (filters.category) parts.push(getCategoryLabel(filters.category));
  return parts.length ? parts.join(" · ") : "todo o catálogo";
}

export function ProductSearch({
  onBack,
  onSelect,
  onCreate,
  onQueryChange,
}: {
  onBack(): void;
  onSelect(productId: number): void;
  onCreate(): void;
  onQueryChange?(query: string): void;
}) {
  const initial = useRef(parseSearchQuery(window.location.search));
  const [mode, setMode] = useState<Mode>(initial.current?.filters.barcode ? "barcode" : "text");
  const [name, setName] = useState(initial.current?.filters.name ?? "");
  const [brand, setBrand] = useState(initial.current?.filters.brand ?? "");
  const [category, setCategory] = useState<Category | undefined>(initial.current?.filters.category);
  const [barcode, setBarcode] = useState(initial.current?.filters.barcode ?? "");
  const [result, setResult] = useState<SearchPage<ProductListItem> | null>(null);
  const [searched, setSearched] = useState<ProductFilters>({});
  const [error, setError] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const { token } = useAuth();

  async function runSearch(filters: ProductFilters, page = 1) {
    const problem = validate(filters);
    if (problem) {
      setError(problem);
      return;
    }
    setError("");
    setIsSearching(true);
    const params = filtersToParams(filters, page);
    if (![...params.keys()].some((key) => key !== "page")) params.set("all", "1");
    const query = `?${params}`;
    window.history.replaceState(null, "", `/search${query}`);
    onQueryChange?.(query);
    try {
      const found = await searchProducts(filters, page, token);
      setResult(found);
      // Só indica quais filtros foram usados; o texto digitado não sai do navegador.
      track("search_performed", {
        mode: filters.barcode !== undefined ? "barcode" : "text",
        name: Boolean(filters.name?.trim()),
        brand: Boolean(filters.brand?.trim()),
        category: filters.category ?? null,
        results: found.total,
        approximate: Boolean(found.approximate),
        page,
      });
      setSearched(filters);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Não foi possível pesquisar agora.");
    } finally {
      setIsSearching(false);
    }
  }

  useEffect(() => {
    if (initial.current) void runSearch(initial.current.filters, initial.current.page);
    // Executa só a busca restaurada da URL ao abrir a tela.
  }, []);

  function currentFilters(overrides: Partial<ProductFilters> = {}): ProductFilters {
    if (mode === "barcode") return { barcode };
    return { name, brand, category, ...overrides };
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void runSearch(currentFilters());
  }

  function chooseCategory(next: Category | undefined) {
    setCategory(next);
    void runSearch(currentFilters({ category: next }));
  }

  function changeMode(next: Mode) {
    setMode(next);
    setResult(null);
    setError("");
  }

  return (
    <section className="productSearch" aria-labelledby="search-title">
      <header className="pageHeader"><button type="button" aria-label="Voltar ao início" onClick={onBack}><ArrowLeft size={24} /></button><h1 id="search-title">Buscar</h1></header>
      <div className="searchModes" role="group" aria-label="Pesquisar por">
        <button type="button" className={mode === "text" ? "active" : ""} aria-pressed={mode === "text"} onClick={() => changeMode("text")}>Produto e marca</button>
        <button type="button" className={mode === "barcode" ? "active" : ""} aria-pressed={mode === "barcode"} onClick={() => changeMode("barcode")}>Código de barras</button>
      </div>
      <form className="search" onSubmit={handleSubmit}>
        {mode === "text" ? (
          <>
            <label className="srOnly" htmlFor="product-search">Nome do produto</label>
            <div className="searchRow">
              <MagnifyingGlass size={24} />
              <input id="product-search" value={name} onChange={(event) => setName(event.target.value)} inputMode="search" placeholder="Ex.: sorvete de baunilha" />
              <button type="submit" disabled={isSearching} aria-label="Executar busca">{isSearching ? <span className="loadingLabel">Buscando...</span> : <CaretRight size={24} />}</button>
            </div>
            <label className="brandFilter" htmlFor="brand-search"><span>Marca <small>(opcional)</small></span></label>
            <input id="brand-search" className="brandInput" value={brand} onChange={(event) => setBrand(event.target.value)} placeholder="Ex.: Kibon" />
          </>
        ) : (
          <>
            <label className="srOnly" htmlFor="barcode-search">Código de barras</label>
            <div className="searchRow">
              <MagnifyingGlass size={24} />
              <input id="barcode-search" value={barcode} onChange={(event) => setBarcode(event.target.value.replace(/\D/g, ""))} inputMode="numeric" maxLength={14} placeholder="Ex.: 7891234567890" required />
              <button type="submit" disabled={isSearching} aria-label="Executar busca">{isSearching ? <span className="loadingLabel">Buscando...</span> : <CaretRight size={24} />}</button>
            </div>
          </>
        )}
      </form>
      {mode === "text" && (
        <div className="categoryFilter" role="group" aria-label="Categoria">
          <button type="button" aria-pressed={!category} disabled={isSearching} onClick={() => chooseCategory(undefined)}>Todas</button>
          {categories.map((option) => (
            <button type="button" key={option} aria-pressed={category === option} disabled={isSearching} onClick={() => chooseCategory(option)}>
              {categoryLabels[option]}
            </button>
          ))}
        </div>
      )}
      {error && <p className="searchError" role="alert">{error}</p>}
      {result && (
        <SearchResults result={result} filters={searched} disabled={isSearching} onSelect={onSelect} onPageChange={(page) => void runSearch(searched, page)} />
      )}
      <button className="primaryButton createProductAction" type="button" onClick={onCreate}><Plus size={20} />Cadastrar produto</button>
    </section>
  );
}

function SearchResults({
  result, filters, disabled, onSelect, onPageChange,
}: {
  result: SearchPage<ProductListItem>;
  filters: ProductFilters;
  disabled: boolean;
  onSelect(productId: number): void;
  onPageChange(page: number): void;
}) {
  const lastPage = Math.max(1, Math.ceil(result.total / result.page_size));
  if (result.items.length === 0) {
    const scope = describeFilters(filters);
    const hint = scope === "todo o catálogo"
      ? "O catálogo ainda está vazio. Cadastre o primeiro produto."
      : `Nada para ${scope}. Tente outro termo, outra categoria ou cadastre o produto.`;
    return <div className="emptyState" aria-live="polite"><strong>Nenhum produto encontrado.</strong><span>{hint}</span></div>;
  }
  return (
    <div className="results" aria-live="polite">
      {result.approximate
        ? <div className="approximateNotice" role="status"><strong>Nada exato para {describeFilters(filters)}.</strong><span>{result.total === 1 ? "Mostrando o mais parecido. Se não for este, cadastre o produto." : `Mostrando os ${result.total} mais parecidos. Se não for nenhum destes, cadastre o produto.`}</span></div>
        : <div className="resultsHeader"><strong>{result.total} {result.total === 1 ? "produto" : "produtos"}</strong><span>{describeFilters(filters)}</span></div>}
      <div className="productGrid">
        {result.items.map((product) => <ProductCard key={product.id} product={product} onSelect={onSelect} />)}
      </div>
      {lastPage > 1 && (
        <div className="pagination">
          <button type="button" disabled={disabled || result.page === 1} onClick={() => onPageChange(result.page - 1)}>Anterior</button>
          <span>Página {result.page} de {lastPage}</span>
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
