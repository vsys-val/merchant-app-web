import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { ApiError } from "../../lib/api";
import { getProductDetail, ProductDetail } from "./product-api";
import { ProductForm } from "./ProductForm";
import "./products.css";

/**
 * Correção de um produto próprio (RF07). Para quem está autenticado, o resumo
 * comunitário já exclui a própria avaliação: qualquer avaliação contada ali é
 * de outra pessoa e bloqueia a correção (RN13). Avisar antes evita preencher um
 * formulário que a API recusaria.
 */
export function ProductEditView({
  productId,
  onBack,
  onSaved,
  onOpenExisting,
}: {
  productId: number;
  onBack(): void;
  onSaved(productId: number): void;
  onOpenExisting(productId: number): void;
}) {
  const { token } = useAuth();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setProduct(null);
    setError("");
    getProductDetail(productId, token)
      .then(setProduct)
      .catch((caught) => setError(caught instanceof ApiError ? caught.message : "Não foi possível carregar o produto."));
  }, [productId, token]);

  if (error) {
    return <section className="detailState"><p role="alert">{error}</p><button type="button" onClick={onBack}>Voltar</button></section>;
  }
  if (!product) return <section className="detailState" aria-live="polite">Carregando produto…</section>;

  const othersReviews = product.community_summary.total_reviews;
  if (othersReviews > 0) {
    return (
      <section className="detailState lockedProduct">
        <p className="eyebrow">Correção indisponível</p>
        <h1>{product.name}</h1>
        <p>
          {othersReviews === 1 ? "Outra pessoa já avaliou" : `${othersReviews} pessoas já avaliaram`} este produto.
          Para não alterar o item que já foi avaliado, o cadastro não pode mais ser corrigido.
        </p>
        <button type="button" onClick={() => onSaved(product.id)}>Ver produto</button>
      </section>
    );
  }

  return <ProductForm initial={product} onCancel={onBack} onSaved={onSaved} onOpenExisting={onOpenExisting} />;
}
