import { FormEvent, useEffect, useState } from "react";
import { ApiError } from "../../lib/api";
import { track } from "../../lib/analytics";
import { useAuth } from "../auth/AuthContext";
import { Review } from "./product-api";
import { Aspect, createReview, ReviewInput, updateReview } from "./review-api";
import "./review-form.css";

const aspects: Array<{ value: Aspect; label: string }> = [
  { value: "taste", label: "Sabor" }, { value: "fragrance", label: "Cheiro ou fragrância" },
  { value: "texture_consistency", label: "Textura ou consistência" }, { value: "effectiveness_performance", label: "Eficácia ou desempenho" },
  { value: "quantity_yield", label: "Quantidade ou rendimento" }, { value: "ease_of_use_preparation", label: "Facilidade de uso ou preparo" },
  { value: "packaging", label: "Embalagem" }, { value: "durability_preservation", label: "Durabilidade ou conservação" },
  { value: "composition_ingredients", label: "Composição ou ingredientes" }, { value: "safety_tolerance", label: "Segurança ou tolerância" },
  { value: "price", label: "Preço" }, { value: "other", label: "Outro" },
];

type Perception = "positive" | "negative";
type ReasonState = Partial<Record<Aspect, Perception>>;
type Choice = { value: string; label: string };

export function ReviewForm({ productId, initial, onCancel, onSaved }: { productId: number; initial?: Review | null; onCancel(): void; onSaved(): void }) {
  const { token } = useAuth();
  const [step, setStep] = useState(1);
  useEffect(() => { track("review_step_viewed", { step, editing: Boolean(initial) }); }, [step]);
  const [repurchase, setRepurchase] = useState(initial?.repurchase_intent ?? "");
  const [quality, setQuality] = useState(initial?.quality ?? "");
  const [expectation, setExpectation] = useState(initial?.expectation ?? "");
  const [valueForMoney, setValueForMoney] = useState(initial?.value_for_money ?? "");
  const [comment, setComment] = useState(initial?.comment ?? "");
  const [reasons, setReasons] = useState<ReasonState>(() => Object.fromEntries((initial?.reasons ?? []).map((reason) => [reason.aspect, reason.perception])) as ReasonState);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function toggleAspect(aspect: Aspect, checked: boolean) {
    setReasons((current) => { const next = { ...current }; if (checked) next[aspect] = current[aspect] ?? "positive"; else delete next[aspect]; return next; });
  }

  function nextStep() {
    setError("");
    if (step === 1 && (!repurchase || !quality || !expectation || !valueForMoney)) return setError("Responda aos quatro critérios antes de continuar.");
    if (step === 2 && Object.keys(reasons).length === 0) return setError("Selecione pelo menos um motivo.");
    if (step === 2 && reasons.other && !comment.trim()) return setError("Explique no comentário o motivo “Outro”.");
    setStep((current) => Math.min(3, current + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step < 3) return nextStep();
    if (!token) return setError("Sua sessão expirou. Entre novamente.");
    const input: ReviewInput = {
      repurchase_intent: repurchase as ReviewInput["repurchase_intent"], quality: quality as ReviewInput["quality"],
      expectation: expectation as ReviewInput["expectation"], value_for_money: valueForMoney as ReviewInput["value_for_money"],
      reasons: Object.entries(reasons).map(([aspect, perception]) => ({ aspect: aspect as Aspect, perception })), comment: comment.trim() || null,
    };
    setError(""); setIsSubmitting(true);
    try {
      if (initial) await updateReview(initial.id, input, token); else await createReview(productId, input, token);
      track("review_saved", { editing: Boolean(initial) });
      onSaved();
    }
    catch (caught) { setError(caught instanceof ApiError ? caught.message : "Não foi possível salvar sua avaliação."); }
    finally { setIsSubmitting(false); }
  }

  return <section className="reviewEditor">
    <header className="reviewProgress"><div><span>Etapa {step} de 3</span><strong>{["Sua experiência", "Seus motivos", "Conferir"][step - 1]}</strong></div><progress value={step} max={3} /></header>
    <form className="reviewForm" onSubmit={handleSubmit}>
      {step === 1 && <div className="criteriaStack">
        <ChoiceGroup name="repurchase" legend="Compraria novamente?" value={repurchase} setValue={setRepurchase} choices={[{ value: "yes", label: "Sim" }, { value: "maybe", label: "Talvez" }, { value: "no", label: "Não" }]} />
        <ChoiceGroup name="quality" legend="Qualidade" value={quality} setValue={setQuality} choices={[{ value: "low", label: "Baixa" }, { value: "adequate", label: "Adequada" }, { value: "high", label: "Alta" }]} />
        <ChoiceGroup name="expectation" legend="Expectativa" value={expectation} setValue={setExpectation} choices={[{ value: "not_met", label: "Não atendeu" }, { value: "met", label: "Atendeu" }, { value: "exceeded", label: "Superou" }]} />
        <ChoiceGroup name="value" legend="Custo-benefício" value={valueForMoney} setValue={setValueForMoney} choices={[{ value: "poor", label: "Ruim" }, { value: "fair", label: "Justo" }, { value: "good", label: "Bom" }]} />
      </div>}
      {step === 2 && <>
        <div><h2>O que chamou atenção?</h2><p className="formHint">Escolha ao menos um aspecto e indique se a percepção foi positiva ou negativa.</p></div>
        <div className="reasonList">{aspects.map(({ value, label }) => <div className={`reasonOption ${reasons[value] ? "selected" : ""}`} key={value}><label><input type="checkbox" checked={Boolean(reasons[value])} onChange={(event) => toggleAspect(value, event.target.checked)} />{label}</label>{reasons[value] && <div className="perceptionChoice"><button type="button" className={reasons[value] === "positive" ? "active" : ""} onClick={() => setReasons((current) => ({ ...current, [value]: "positive" }))}>Positiva</button><button type="button" className={reasons[value] === "negative" ? "active" : ""} onClick={() => setReasons((current) => ({ ...current, [value]: "negative" }))}>Negativa</button></div>}</div>)}</div>
        <label className="commentField">Comentário <span>({reasons.other ? "obrigatório" : "opcional"})</span><textarea maxLength={1000} rows={4} value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Conte o que aconteceu com suas próprias palavras." /><small>{comment.length}/1.000</small></label>
      </>}
      {step === 3 && <ReviewConfirmation repurchase={repurchase} quality={quality} expectation={expectation} valueForMoney={valueForMoney} reasons={reasons} comment={comment} />}
      {error && <p className="formError" role="alert">{error}</p>}
      <div className="formActions">{step === 1 ? <button className="secondaryButton" type="button" onClick={onCancel}>Cancelar</button> : <button className="secondaryButton" type="button" onClick={() => { setStep((current) => current - 1); setError(""); }}>Voltar</button>}<button className="primaryButton" type="submit" disabled={isSubmitting}>{isSubmitting ? "Salvando..." : step < 3 ? "Continuar" : initial ? "Salvar alterações" : "Publicar avaliação"}</button></div>
    </form>
  </section>;
}

function ChoiceGroup({ name, legend, value, setValue, choices }: { name: string; legend: string; value: string; setValue(value: string): void; choices: Choice[] }) {
  return <fieldset className="choiceGroup"><legend>{legend}</legend><div>{choices.map((choice) => <label key={choice.value}><input type="radio" name={name} value={choice.value} checked={value === choice.value} onChange={() => setValue(choice.value)} /><span>{choice.label}</span></label>)}</div></fieldset>;
}

function ReviewConfirmation({ repurchase, quality, expectation, valueForMoney, reasons, comment }: { repurchase: string; quality: string; expectation: string; valueForMoney: string; reasons: ReasonState; comment: string }) {
  const labels: Record<string, string> = { yes: "Sim", maybe: "Talvez", no: "Não", high: "Alta", adequate: "Adequada", low: "Baixa", exceeded: "Superou", met: "Atendeu", not_met: "Não atendeu", good: "Bom", fair: "Justo", poor: "Ruim", positive: "Positiva", negative: "Negativa" };
  return <div className="reviewConfirmation"><h2>Confira sua avaliação</h2><dl><div><dt>Compraria novamente?</dt><dd>{labels[repurchase]}</dd></div><div><dt>Qualidade</dt><dd>{labels[quality]}</dd></div><div><dt>Expectativa</dt><dd>{labels[expectation]}</dd></div><div><dt>Custo-benefício</dt><dd>{labels[valueForMoney]}</dd></div>{Object.entries(reasons).map(([aspect, perception]) => <div key={aspect}><dt>{aspects.find((item) => item.value === aspect)?.label}</dt><dd>{labels[perception]}</dd></div>)}</dl>{comment && <blockquote>{comment}</blockquote>}<p className="publicNote">Sua avaliação será pública com seu nome de exibição.</p></div>;
}
