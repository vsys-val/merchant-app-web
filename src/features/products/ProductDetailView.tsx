import { useEffect, useRef, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { ApiError } from "../../lib/api";
import { useModalDialog } from "../../lib/useModalDialog";
import { track } from "../../lib/analytics";
import { getAspectLabel } from "./aspect-labels";
import { getCategoryLabel } from "./category-labels";
import { AspectMentions, CommunityReview, getCommunityReviews, getProductDetail, Page, ProductDetail, Review } from "./product-api";
import { deleteReview } from "./review-api";
import { ReviewForm } from "./ReviewForm";
import "./products.css";
import { ProductAttribution } from "./ProductAttribution";
import { ProductImage } from "./ProductImage";

const labels: Record<string, string> = {
  yes: "Sim", maybe: "Talvez", no: "Não", high: "Alta", adequate: "Adequada", low: "Baixa",
  exceeded: "Superou", met: "Atendeu", not_met: "Não atendeu", good: "Bom", fair: "Justo", poor: "Ruim",
};

export function ProductDetailView({ productId, onBack }: { productId: number; onBack(): void }) {
  const { user } = useAuth();
  return <ProductDetailSession key={`${productId}:${user?.id ?? "visitor"}`} productId={productId} onBack={onBack} />;
}

function ProductDetailSession({ productId, onBack }: { productId: number; onBack(): void }) {
  const { user } = useAuth();
  const requestVersion = useRef(0);
  const mounted = useRef(true);
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [reviews, setReviews] = useState<Page<CommunityReview> | null>(null);
  const [reviewPage, setReviewPage] = useState(1);
  const [editingReview, setEditingReview] = useState(false);
  const [reviewPendingDeletion, setReviewPendingDeletion] = useState<Review | null>(null);
  const [isDeletingReview, setIsDeletingReview] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [error, setError] = useState("");
  const [failedPhotoUrl, setFailedPhotoUrl] = useState<string | null>(null);

  function closeDeleteConfirmation() {
    if (isDeletingReview) return;
    setReviewPendingDeletion(null);
    setDeleteError("");
  }

  const deleteDialog = useModalDialog(closeDeleteConfirmation, Boolean(reviewPendingDeletion));

  async function load(page = 1) {
    const version = ++requestVersion.current;
    try {
      const [detail, reviewResult] = await Promise.all([getProductDetail(productId), getCommunityReviews(productId, page)]);
      if (!mounted.current || version !== requestVersion.current) return null;
      if (detail.id !== productId) throw new Error("Produto inesperado na resposta.");
      setError(""); setProduct(detail); setReviews(reviewResult); setReviewPage(page);
      return detail;
    } catch (caught) {
      if (!mounted.current || version !== requestVersion.current) return null;
      throw caught;
    }
  }

  useEffect(() => {
    mounted.current = true;
    setError(""); setProduct(null); setEditingReview(false);
    load()
      .then((detail) => detail && track("product_viewed", {
        product_id: detail.id,
        own_review: detail.your_review !== null,
        community_reviews: detail.community_summary.total_reviews,
      }))
      .catch((caught) => { if (mounted.current) setError(caught instanceof ApiError ? caught.message : "Não foi possível carregar o produto."); });
    return () => { mounted.current = false; requestVersion.current += 1; };
  }, [productId]);

  async function changeReviewPage(page: number) {
    const version = ++requestVersion.current;
    setError("");
    try {
      const result = await getCommunityReviews(productId, page);
      if (!mounted.current || version !== requestVersion.current) return;
      setReviews(result); setReviewPage(page);
    } catch (caught) {
      if (mounted.current && version === requestVersion.current) setError(caught instanceof ApiError ? caught.message : "Não foi possível carregar as avaliações.");
    }
  }

  async function removeOwnReview(review: Review) {
    if (!user || product?.id !== productId || product.your_review?.id !== review.id || isDeletingReview) return;
    setDeleteError("");
    setIsDeletingReview(true);
    try {
      await deleteReview(review.id);
      if (!mounted.current) return;
      setReviewPendingDeletion(null);
      setProduct(null);
      await load().catch(() => { if (mounted.current) setError("Avaliação excluída, mas não foi possível atualizar o produto. Reabra o produto para tentar novamente."); });
    }
    catch (caught) { if (mounted.current) setDeleteError(caught instanceof ApiError ? caught.message : "Não foi possível excluir a avaliação."); }
    finally { if (mounted.current) setIsDeletingReview(false); }
  }

  if (error && !product) return <section className="detailState"><p role="alert">{error}</p><button onClick={onBack}>Voltar à busca</button></section>;
  if (!product || !reviews) return <section className="detailState" aria-live="polite">Carregando produto…</section>;
  if (editingReview && user) return <section className="detailPage"><button className="backButton" type="button" onClick={() => setEditingReview(false)}>← Voltar ao produto</button><ReviewForm productId={productId} initial={product.your_review} onCancel={() => setEditingReview(false)} onSaved={() => { if (!mounted.current) return; setEditingReview(false); setProduct(null); void load().catch(() => { if (mounted.current) setError("Avaliação salva, mas não foi possível atualizar o produto. Reabra o produto para tentar novamente."); }); }} /></section>;

  const totalPages = Math.max(1, Math.ceil(reviews.total / reviews.page_size));
  return (
    <section className="detailPage">
      <button className="backButton" type="button" onClick={onBack}>← Voltar à busca</button>
      <header className="productHeading"><div><p className="eyebrow">{getCategoryLabel(product.category)}</p><h1>{product.name}</h1><p>{product.brand}{product.variant ? ` · ${product.variant}` : ""}</p></div><div className="quantityBadge"><strong>{product.quantity}</strong><span>{product.unit}</span></div></header>
      {product.image_url && (
        <figure className="productPhoto">
          <ProductImage product={product} size="hero" onImageError={() => setFailedPhotoUrl(product.image_url ?? null)} />
          {/* Fotos do Open Food Facts são CC BY-SA: o crédito fica junto da imagem. */}
          {failedPhotoUrl !== product.image_url && <ProductAttribution product={product} />}
        </figure>
      )}
      <div className="detailBody">
      <div className="summaryHeader"><div><p className="sectionNumber">01</p><h2>Resumo da comunidade</h2></div><p>Baseado em {product.community_summary.total_reviews} {product.community_summary.total_reviews === 1 ? "avaliação" : "avaliações"} de outras pessoas.</p></div>
      <div className="distributionGrid"><Distribution title="Compraria novamente?" values={product.community_summary.repurchase_intent} /><Distribution title="Qualidade" values={product.community_summary.quality} /><Distribution title="Expectativa" values={product.community_summary.expectation} /><Distribution title="Custo-benefício" values={product.community_summary.value_for_money} /></div>
      <CommunityHighlights reasons={product.community_summary.reasons ?? []} total={product.community_summary.total_reviews} />
      {user ? <section className="yourReview"><p className="sectionNumber">02</p><h2>Sua experiência</h2>{product.your_review ? <><ReviewContent review={product.your_review} /><div className="reviewActions"><button className="secondaryButton" type="button" onClick={() => setEditingReview(true)}>Editar</button><button className="dangerButton" type="button" onClick={() => { setDeleteError(""); setReviewPendingDeletion(product.your_review); }}>Excluir</button></div></> : <><p>Você ainda não avaliou este produto.</p><button className="primaryButton" type="button" onClick={() => setEditingReview(true)}>Avaliar produto</button></>}</section> : <section className="yourReview"><p>Entre na sua conta para registrar sua experiência com este produto.</p></section>}
      {error && <p className="formError" role="alert">{error}</p>}
      <section className="communityReviews">
        <div className="reviewsTitle"><div><p className="sectionNumber">{user ? "03" : "02"}</p><h2>Avaliações da comunidade</h2></div><span>{reviews.total} publicadas</span></div>
        {reviews.items.length === 0 ? <div className="emptyState"><strong>Ainda não há avaliações.</strong><span>Este produto está esperando sua primeira experiência.</span></div> : reviews.items.map((review) => <article className="reviewCard" key={review.id}><div className="reviewAuthor"><strong>{review.author_name}</strong><time dateTime={review.created_at}>{new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(new Date(review.created_at))}</time></div><ReviewContent review={review} /></article>)}
        {totalPages > 1 && <div className="pagination"><button disabled={reviewPage === 1} onClick={() => void changeReviewPage(reviewPage - 1)}>Anterior</button><button disabled={reviewPage === totalPages} onClick={() => void changeReviewPage(reviewPage + 1)}>Próxima</button></div>}
      </section>
      </div>
      {reviewPendingDeletion && (
        <div className="deleteConfirmBackdrop">
          <section ref={deleteDialog.dialogRef} className="deleteConfirmDialog" role="dialog" tabIndex={-1} aria-modal="true" aria-labelledby="delete-review-title" aria-describedby="delete-review-description" onKeyDown={deleteDialog.onKeyDown}>
            <p className="eyebrow">Confirmação</p>
            <h2 id="delete-review-title">Excluir sua avaliação?</h2>
            <p id="delete-review-description">Esta ação não pode ser desfeita.</p>
            {deleteError && <p className="formError" role="alert">{deleteError}</p>}
            <div className="deleteConfirmActions">
              <button className="secondaryButton" type="button" autoFocus disabled={isDeletingReview} onClick={closeDeleteConfirmation}>Cancelar</button>
              <button className="dangerButton" type="button" disabled={isDeletingReview} onClick={() => void removeOwnReview(reviewPendingDeletion)}>{isDeletingReview ? "Excluindo..." : "Excluir avaliação"}</button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}

function Distribution({ title, values }: { title: string; values: Record<string, number> }) {
  return <article className="distributionCard"><h3>{title}</h3>{Object.entries(values).map(([key, value]) => <div className="distributionRow" key={key}><div><span>{labels[key] ?? key}</span><strong>{value.toFixed(0)}%</strong></div><div className="bar" role="progressbar" aria-label={labels[key] ?? key} aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${Math.min(100, value)}%` }} /></div></div>)}</article>;
}
const HIGHLIGHT_LIMIT = 3;

/** Motivos mais citados pela comunidade, separados em elogios e críticas. */
function CommunityHighlights({ reasons, total }: { reasons: AspectMentions[]; total: number }) {
  if (total === 0 || reasons.length === 0) return null;
  const top = (perception: "positive" | "negative") => reasons
    .filter((item) => item[perception] > 0)
    .sort((a, b) => b[perception] - a[perception] || getAspectLabel(a.aspect).localeCompare(getAspectLabel(b.aspect), "pt-BR"))
    .slice(0, HIGHLIGHT_LIMIT)
    .map((item) => ({ aspect: item.aspect, count: item[perception] }));
  const columns = [
    { perception: "positive" as const, title: "Mais elogiado", sign: "+", empty: "Nenhum elogio citado ainda.", items: top("positive") },
    { perception: "negative" as const, title: "Mais criticado", sign: "−", empty: "Nenhuma crítica citada ainda.", items: top("negative") },
  ];
  return (
    <section className="communityHighlights" aria-labelledby="community-highlights-title">
      <h3 id="community-highlights-title">O que a comunidade destaca</h3>
      <div className="highlightColumns">
        {columns.map((column) => (
          <div className={`highlightColumn highlightColumn--${column.perception}`} key={column.perception}>
            <h4><span className="highlightSign" aria-hidden="true">{column.sign}</span>{column.title}</h4>
            {column.items.length === 0 ? <p className="highlightEmpty">{column.empty}</p> : (
              <ul>
                {column.items.map(({ aspect, count }) => (
                  <li key={aspect}>
                    <div><span>{getAspectLabel(aspect)}</span><strong>{count} de {total}<span className="srOnly"> avaliações</span></strong></div>
                    <div className="bar" aria-hidden="true"><span style={{ width: `${Math.round((count / total) * 100)}%` }} /></div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function ReviewContent({ review }: { review: Review }) {
  return <div className="reviewContent"><div className="reviewTags"><span>Recompra: {labels[review.repurchase_intent]}</span><span>Qualidade: {labels[review.quality]}</span><span>Expectativa: {labels[review.expectation]}</span><span>Custo-benefício: {labels[review.value_for_money]}</span></div>{review.reasons.length > 0 && <ul className="reasonTags" aria-label="Motivos">{review.reasons.map((reason) => <li className={`reasonTag reasonTag--${reason.perception}`} key={reason.aspect}><span aria-hidden="true">{reason.perception === "positive" ? "+" : "−"}</span> {getAspectLabel(reason.aspect)}<span className="srOnly">{reason.perception === "positive" ? " (positivo)" : " (negativo)"}</span></li>)}</ul>}{review.comment && <p>“{review.comment}”</p>}</div>;
}
