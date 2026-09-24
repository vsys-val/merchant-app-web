import { FormEvent, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { ApiError } from "../../lib/api";
import { track } from "../../lib/analytics";
import {
  Category,
  createProduct,
  ProductCreateInput,
  ProductPatchInput,
  ProductPublic,
  updateProduct,
} from "./product-api";
import "./product-form.css";

const categories: Array<{ value: Category; label: string }> = [
  { value: "food", label: "Alimentos" },
  { value: "beverages", label: "Bebidas" },
  { value: "cleaning", label: "Limpeza" },
  { value: "personal_hygiene", label: "Higiene pessoal" },
  { value: "household_utilities", label: "Utilidades domésticas" },
  { value: "other", label: "Outros" },
];

type Unit = ProductCreateInput["unit"];

function formatQuantity(value: number) {
  return String(value).replace(".", ",");
}

/** Na correção, só os campos alterados vão para a API. */
export function buildProductPatch(initial: ProductPublic, current: ProductCreateInput): ProductPatchInput {
  const patch: ProductPatchInput = {};
  if (current.name.trim() !== initial.name) patch.name = current.name;
  if (current.brand.trim() !== initial.brand) patch.brand = current.brand;
  if (current.variant !== initial.variant) patch.variant = current.variant;
  if (current.category !== initial.category) patch.category = current.category;
  if (current.barcode !== initial.barcode) patch.barcode = current.barcode;
  // A API normaliza a medida a partir do par; os dois seguem juntos.
  if (current.quantity !== initial.quantity || current.unit !== initial.unit) {
    patch.quantity = current.quantity;
    patch.unit = current.unit;
  }
  return patch;
}

export function ProductForm({
  initial,
  onCancel,
  onSaved,
  onOpenExisting,
}: {
  /** Presente na correção de um produto já cadastrado. */
  initial?: ProductPublic;
  onCancel(): void;
  onSaved(productId: number): void;
  onOpenExisting(productId: number): void;
}) {
  const { token } = useAuth();
  const isEditing = initial !== undefined;
  const [name, setName] = useState(initial?.name ?? "");
  const [brand, setBrand] = useState(initial?.brand ?? "");
  const [variant, setVariant] = useState(initial?.variant ?? "");
  const [quantity, setQuantity] = useState(initial ? formatQuantity(initial.quantity) : "");
  const [unit, setUnit] = useState<Unit>(initial?.unit ?? "g");
  const [category, setCategory] = useState<Category>(initial?.category ?? "food");
  const [barcode, setBarcode] = useState(initial?.barcode ?? "");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [existingProductId, setExistingProductId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) {
      setError(isEditing ? "Entre na sua conta para corrigir o produto." : "Entre na sua conta para cadastrar um produto.");
      return;
    }

    const input: ProductCreateInput = {
      name,
      brand,
      variant: variant.trim() || null,
      quantity: Number(quantity.replace(",", ".")),
      unit,
      category,
      barcode: barcode.trim() || null,
    };
    setError("");
    setNotice("");
    setExistingProductId(null);
    if (initial) {
      const patch = buildProductPatch(initial, input);
      if (Object.keys(patch).length === 0) {
        setNotice("Nada foi alterado.");
        return;
      }
      setIsSubmitting(true);
      try {
        const product = await updateProduct(initial.id, patch, token);
        track("product_edit_saved", { fields: Object.keys(patch).length });
        onSaved(product.id);
      } catch (caught) {
        setError(caught instanceof ApiError ? caught.message : "Não foi possível salvar a correção.");
        setExistingProductId(getExistingProductId(caught));
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    setIsSubmitting(true);
    track("product_create_submitted", { barcode: input.barcode !== null });
    try {
      const product = await createProduct(input, token);
      track("product_created", { category: product.category });
      onSaved(product.id);
    } catch (caught) {
      if (caught instanceof ApiError && caught.code === "product_conflict") track("product_create_conflict");
      setError(caught instanceof ApiError ? caught.message : "Não foi possível cadastrar o produto.");
      setExistingProductId(getExistingProductId(caught));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="productFormPage">
      <button className="backButton" type="button" onClick={onCancel}>← Cancelar</button>
      <header>
        <p className="eyebrow">{isEditing ? "Seu cadastro" : "Novo item do catálogo"}</p>
        <h1>{isEditing ? "Corrigir produto" : "Cadastrar produto"}</h1>
        <p>{isEditing
          ? "Ajuste o que estiver diferente da embalagem. Depois que outra pessoa avaliar este produto, ele não poderá mais ser corrigido."
          : "Informe o que aparece na embalagem. A API padronizará quantidade e unidade automaticamente."}</p>
      </header>

      <form className="productForm" onSubmit={handleSubmit} onChange={() => setNotice("")}>
        <fieldset>
          <legend>Identificação</legend>
          <div className="formGrid">
            <label className="fieldWide">Nome do produto
              <input minLength={2} maxLength={120} value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex.: Sorvete de baunilha" required />
            </label>
            <label>Marca
              <input minLength={1} maxLength={80} value={brand} onChange={(event) => setBrand(event.target.value)} placeholder="Ex.: Marca X" required />
            </label>
            <label><span className="fieldLabel">Variante <small>(opcional)</small></span>
              <input maxLength={80} value={variant} onChange={(event) => setVariant(event.target.value)} placeholder="Ex.: Baunilha" />
            </label>
          </div>
        </fieldset>

        <fieldset>
          <legend>Medida e categoria</legend>
          <div className="formGrid formGrid--measure">
            <label>Quantidade
              <input inputMode="decimal" value={quantity} onChange={(event) => setQuantity(event.target.value)} pattern="[0-9]+([,.][0-9]+)?" placeholder="Ex.: 1,5" required />
            </label>
            <label>Unidade
              <select value={unit} onChange={(event) => setUnit(event.target.value as Unit)}>
                <option value="g">gramas (g)</option><option value="kg">quilogramas (kg)</option>
                <option value="ml">mililitros (ml)</option><option value="L">litros (L)</option>
                <option value="un">unidades (un)</option>
              </select>
            </label>
            <label>Categoria
              <select value={category} onChange={(event) => setCategory(event.target.value as Category)}>
                {categories.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </label>
          </div>
        </fieldset>

        <fieldset>
          <legend>Código de barras</legend>
          <label><span className="fieldLabel">Código GTIN <small>(opcional)</small></span>
            <input inputMode="numeric" pattern="([0-9]{8}|[0-9]{12}|[0-9]{13}|[0-9]{14})" maxLength={14} value={barcode} onChange={(event) => setBarcode(event.target.value)} placeholder="8, 12, 13 ou 14 dígitos" />
          </label>
          <small>O dígito verificador será validado pela API.</small>
        </fieldset>

        {notice && <p className="formNotice" role="status">{notice}</p>}
        {error && (
          <div className="formError" role="alert">
            <p>{error}</p>
            {existingProductId !== null && (
              <button type="button" className="secondaryButton" onClick={() => onOpenExisting(existingProductId)}>
                Ver produto já cadastrado
              </button>
            )}
          </div>
        )}
        <div className="formActions">
          <button type="button" className="secondaryButton" onClick={onCancel}>Cancelar</button>
          <button type="submit" className="primaryButton" disabled={isSubmitting}>{isSubmitting ? "Salvando..." : isEditing ? "Salvar correção" : "Cadastrar produto"}</button>
        </div>
      </form>
    </section>
  );
}

function getExistingProductId(caught: unknown): number | null {
  if (!(caught instanceof ApiError) || caught.code !== "product_conflict") return null;
  const details = caught.details as { existing_product_id?: unknown } | null | undefined;
  return typeof details?.existing_product_id === "number" ? details.existing_product_id : null;
}
