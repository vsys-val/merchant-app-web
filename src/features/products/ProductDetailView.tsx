import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { ApiError } from "../../lib/api";
import { CommunityReview, getCommunityReviews, getProductDetail, Page, ProductDetail, Review } from "./product-api";
import { deleteReview } from "./review-api";
import { ReviewForm } from "./ReviewForm";
import "./products.css";

const labels: Record<string, string> = {
  yes: "Sim", maybe: "Talvez", no: "Não", high: "Alta", adequate: "Adequada", low: "Baixa",
  exceeded: "Superou", met: "Atendeu", not_met: "Não atendeu", good: "Bom", fair: "Justo", poor: "Ruim",
};

export function ProductDetailView({ productId, onBack }: { productId: number; onBack(): void }) {
  const { token, user } = useAuth();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [reviews, setReviews] = useState<Page<CommunityReview> | null>(null);
  const [reviewPage, setReviewPage] = useState(1);
  const [editingReview, setEditingReview] = useState(false);
  const [error, setError] = useState("");

  async function load(page = 1) {
    const [detail, reviewResult] = await Promise.all([getProductDetail(productId, token), getCommunityReviews(productId, page, token)]);
    setProduct(detail); setReviews(reviewResult); setReviewPage(page);
  }

  useEffect(() => {
    setError(""); setProduct(null); setEditingReview(false);
    load().catch((caught) => setError(caught instanceof ApiError ? caught.message : "Não foi possível carregar o produto."));
  }, [productId, token]);

  async function changeReviewPage(page: number) {
    try { setReviews(await getCommunityReviews(productId, page, token)); setReviewPage(page); }
    catch (caught) { setError(caught instanceof ApiError ? caught.message : "Não foi possível carregar as avaliações."); }
  }

  async function removeOwnReview(review: Review) {
    if (!token || !window.confirm("Excluir sua avaliação? Esta ação não pode ser desfeita.")) return;
    try { await deleteReview(review.id, token); await load(); }
    catch (caught) { setError(caught instanceof ApiError ? caught.message : "Não foi possível excluir a avaliação."); }
  }

  if (error && !product) return <section className="detailState"><p role="alert">{error}</p><button onClick={onBack}>Voltar à busca</button></section>;
  if (!product || !reviews) return <section className="detailState" aria-live="polite">Carregando produto…</section>;
  if (editingReview && user) return <section className="detailPage"><button className="backButton" type="button" onClick={() => setEditingReview(false)}>← Voltar ao produto</button><ReviewForm productId={productId} initial={product.your_review} onCancel={() => setEditingReview(false)} onSaved={() => { setEditingReview(false); void load(); }} /></section>;

  const totalPages = Math.max(1, Math.ceil(reviews.total / reviews.page_size));
  return (
    <section className="detailPage">
      <button className="backButton" type="button" onClick={onBack}>← Voltar à busca</button>
      <header className="productHeading"><div><p className="eyebrow">{product.category.replaceAll("_", " ")}</p><h1>{product.name}</h1><p>{product.brand}{product.variant ? ` · ${product.variant}` : ""}</p></div><div className="quantityBadge"><strong>{product.quantity}</strong><span>{product.unit}</span></div></header>
      <div className="summaryHeader"><div><p className="sectionNumber">01</p><h2>Resumo da comunidade</h2></div><p>Baseado em {product.community_summary.total_reviews} {product.community_summary.total_reviews === 1 ? "avaliação" : "avaliações"} de outras pessoas.</p></div>
      <div className="distributionGrid"><Distribution title="Compraria novamente?" values={product.community_summary.repurchase_intent} /><Distribution title="Qualidade" values={product.community_summary.quality} /><Distribution title="Expectativa" values={product.community_summary.expectation} /><Distribution title="Custo-benefício" values={product.community_summary.value_for_money} /></div>
      {user ? <section className="yourReview"><p className="sectionNumber">02</p><h2>Sua experiência</h2>{product.your_review ? <><ReviewContent review={product.your_review} /><div className="reviewActions"><button className="secondaryButton" type="button" onClick={() => setEditingReview(true)}>Editar</button><button className="dangerButton" type="button" onClick={() => void removeOwnReview(product.your_review!)}>Excluir</button></div></> : <><p>Você ainda não avaliou este produto.</p><button className="primaryButton" type="button" onClick={() => setEditingReview(true)}>Avaliar produto</button></>}</section> : <section className="yourReview"><p>Entre na sua conta para registrar sua experiência com este produto.</p></section>}
      {error && <p className="formError" role="alert">{error}</p>}
      <section className="communityReviews">
        <div className="reviewsTitle"><div><p className="sectionNumber">{user ? "03" : "02"}</p><h2>Avaliações da comunidade</h2></div><span>{reviews.total} publicadas</span></div>
        {reviews.items.length === 0 ? <div className="emptyState"><strong>Ainda não há avaliações.</strong><span>Este produto está esperando sua primeira experiência.</span></div> : reviews.items.map((review) => <article className="reviewCard" key={review.id}><div className="reviewAuthor"><strong>{review.author_name}</strong><time dateTime={review.created_at}>{new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(new Date(review.created_at))}</time></div><ReviewContent review={review} /></article>)}
        {totalPages > 1 && <div className="pagination"><button disabled={reviewPage === 1} onClick={() => void changeReviewPage(reviewPage - 1)}>Anterior</button><button disabled={reviewPage === totalPages} onClick={() => void changeReviewPage(reviewPage + 1)}>Próxima</button></div>}
      </section>
    </section>
  );
}

function Distribution({ title, values }: { title: string; values: Record<string, number> }) {
  return <article className="distributionCard"><h3>{title}</h3>{Object.entries(values).map(([key, value]) => <div className="distributionRow" key={key}><div><span>{labels[key] ?? key}</span><strong>{value.toFixed(0)}%</strong></div><div className="bar" role="progressbar" aria-label={labels[key] ?? key} aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${Math.min(100, value)}%` }} /></div></div>)}</article>;
}
function ReviewContent({ review }: { review: Review }) {
  return <div className="reviewContent"><div className="reviewTags"><span>Recompra: {labels[review.repurchase_intent]}</span><span>Qualidade: {labels[review.quality]}</span><span>Expectativa: {labels[review.expectation]}</span><span>Custo-benefício: {labels[review.value_for_money]}</span></div>{review.comment && <p>“{review.comment}”</p>}</div>;
}
