import { FormEvent, useState } from "react";
import { ApiError } from "../../lib/api";
import { useAuth } from "../auth/AuthContext";
import { Review } from "./product-api";
import {
  Aspect,
  createReview,
  ReviewInput,
  updateReview,
} from "./review-api";
import "./review-form.css";

const aspects: Array<{ value: Aspect; label: string }> = [
  { value: "taste", label: "Sabor" },
  { value: "fragrance", label: "Fragrância" },
  { value: "texture_consistency", label: "Textura ou consistência" },
  { value: "effectiveness_performance", label: "Eficácia ou desempenho" },
  { value: "quantity_yield", label: "Quantidade ou rendimento" },
  { value: "ease_of_use_preparation", label: "Facilidade de uso ou preparo" },
  { value: "packaging", label: "Embalagem" },
  { value: "durability_preservation", label: "Durabilidade ou conservação" },
  { value: "composition_ingredients", label: "Composição ou ingredientes" },
  { value: "safety_tolerance", label: "Segurança ou tolerância" },
  { value: "price", label: "Preço" },
  { value: "other", label: "Outro" },
];

type Perception = "positive" | "negative";
type ReasonState = Partial<Record<Aspect, Perception>>;

export function ReviewForm({
  productId,
  initial,
  onCancel,
  onSaved,
}: {
  productId: number;
  initial?: Review | null;
  onCancel(): void;
  onSaved(): void;
}) {
  const { token } = useAuth();
  const [repurchase, setRepurchase] = useState(initial?.repurchase_intent ?? "yes");
  const [quality, setQuality] = useState(initial?.quality ?? "adequate");
  const [expectation, setExpectation] = useState(initial?.expectation ?? "met");
  const [valueForMoney, setValueForMoney] = useState(initial?.value_for_money ?? "fair");
  const [comment, setComment] = useState(initial?.comment ?? "");
  const [reasons, setReasons] = useState<ReasonState>(() =>
    Object.fromEntries((initial?.reasons ?? []).map((reason) => [reason.aspect, reason.perception])) as ReasonState,
  );
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function toggleAspect(aspect: Aspect, checked: boolean) {
    setReasons((current) => {
      const next = { ...current };
      if (checked) next[aspect] = current[aspect] ?? "positive";
      else delete next[aspect];
      return next;
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return setError("Sua sessão expirou. Entre novamente.");
    const selectedReasons = Object.entries(reasons).map(([aspect, perception]) => ({
      aspect: aspect as Aspect,
      perception,
    }));
    if (selectedReasons.length === 0) return setError("Selecione pelo menos um motivo.");
    if (reasons.other && !comment.trim()) return setError("Explique no comentário o motivo “Outro”.");

    const input: ReviewInput = {
      repurchase_intent: repurchase,
      quality,
      expectation,
      value_for_money: valueForMoney,
      reasons: selectedReasons,
      comment: comment.trim() || null,
    };

    setError("");
    setIsSubmitting(true);
    try {
      if (initial) await updateReview(initial.id, input, token);
      else await createReview(productId, input, token);
      onSaved();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Não foi possível salvar sua avaliação.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="reviewEditor">
      <div className="editorHeading">
        <div><p className="eyebrow">{initial ? "Atualizar experiência" : "Sua experiência"}</p><h2>{initial ? "Editar avaliação" : "Avaliar este produto"}</h2></div>
        <button className="closeButton closeButton--inline" type="button" onClick={onCancel} aria-label="Fechar">×</button>
      </div>
      <form className="reviewForm" onSubmit={handleSubmit}>
        <div className="criteriaGrid">
          <label>Compraria novamente?
            <select value={repurchase} onChange={(event) => setRepurchase(event.target.value as typeof repurchase)}>
              <option value="yes">Sim</option><option value="maybe">Talvez</option><option value="no">Não</option>
            </select>
          </label>
          <label>Qualidade
            <select value={quality} onChange={(event) => setQuality(event.target.value as typeof quality)}>
              <option value="high">Alta</option><option value="adequate">Adequada</option><option value="low">Baixa</option>
            </select>
          </label>
          <label>Atendeu à expectativa?
            <select value={expectation} onChange={(event) => setExpectation(event.target.value as typeof expectation)}>
              <option value="exceeded">Superou</option><option value="met">Atendeu</option><option value="not_met">Não atendeu</option>
            </select>
          </label>
          <label>Custo-benefício
            <select value={valueForMoney} onChange={(event) => setValueForMoney(event.target.value as typeof valueForMoney)}>
              <option value="good">Bom</option><option value="fair">Justo</option><option value="poor">Ruim</option>
            </select>
          </label>
        </div>

        <fieldset className="reasonFieldset">
          <legend>O que mais influenciou sua experiência?</legend>
          <p>Selecione entre 1 e 12 motivos e indique se cada percepção foi positiva ou negativa.</p>
          <div className="reasonGrid">
            {aspects.map(({ value, label }) => (
              <div className={`reasonOption ${reasons[value] ? "selected" : ""}`} key={value}>
                <label><input type="checkbox" checked={Boolean(reasons[value])} onChange={(event) => toggleAspect(value, event.target.checked)} />{label}</label>
                {reasons[value] && <select aria-label={`Percepção sobre ${label}`} value={reasons[value]} onChange={(event) => setReasons((current) => ({ ...current, [value]: event.target.value as Perception }))}><option value="positive">Positiva</option><option value="negative">Negativa</option></select>}
              </div>
            ))}
          </div>
        </fieldset>

        <label className="commentField">Comentário <span>(opcional, exceto ao escolher “Outro”)</span>
          <textarea maxLength={1000} rows={5} value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Conte o que aconteceu com suas próprias palavras." />
          <small>{comment.length}/1000</small>
        </label>

        {error && <p className="formError" role="alert">{error}</p>}
        <div className="formActions"><button className="secondaryButton" type="button" onClick={onCancel}>Cancelar</button><button className="primaryButton" type="submit" disabled={isSubmitting}>{isSubmitting ? "Salvando..." : initial ? "Salvar alterações" : "Publicar avaliação"}</button></div>
      </form>
    </section>
  );
}
