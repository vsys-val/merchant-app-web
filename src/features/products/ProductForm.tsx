import { FormEvent, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { ApiError } from "../../lib/api";
import { Category, createProduct, ProductCreateInput } from "./product-api";
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

export function ProductForm({
  onCancel,
  onCreated,
}: {
  onCancel(): void;
  onCreated(productId: number): void;
}) {
  const { token } = useAuth();
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [variant, setVariant] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState<Unit>("g");
  const [category, setCategory] = useState<Category>("food");
  const [barcode, setBarcode] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) {
      setError("Entre na sua conta para cadastrar um produto.");
      return;
    }

    setError("");
    setIsSubmitting(true);
    try {
      const product = await createProduct({
        name,
        brand,
        variant: variant.trim() || null,
        quantity: Number(quantity.replace(",", ".")),
        unit,
        category,
        barcode: barcode.trim() || null,
      }, token);
      onCreated(product.id);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Não foi possível cadastrar o produto.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="productFormPage">
      <button className="backButton" type="button" onClick={onCancel}>← Cancelar</button>
      <header>
        <p className="eyebrow">Novo item do catálogo</p>
        <h1>Cadastrar produto</h1>
        <p>Informe o que aparece na embalagem. A API padronizará quantidade e unidade automaticamente.</p>
      </header>

      <form className="productForm" onSubmit={handleSubmit}>
        <fieldset>
          <legend>Identificação</legend>
          <div className="formGrid">
            <label className="fieldWide">Nome do produto
              <input minLength={2} maxLength={120} value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex.: Sorvete de baunilha" required />
            </label>
            <label>Marca
              <input minLength={1} maxLength={80} value={brand} onChange={(event) => setBrand(event.target.value)} placeholder="Ex.: Marca X" required />
            </label>
            <label>Variante <span>(opcional)</span>
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
          <label>Código GTIN <span>(opcional)</span>
            <input inputMode="numeric" pattern="([0-9]{8}|[0-9]{12}|[0-9]{13}|[0-9]{14})" maxLength={14} value={barcode} onChange={(event) => setBarcode(event.target.value)} placeholder="8, 12, 13 ou 14 dígitos" />
          </label>
          <small>O dígito verificador será validado pela API.</small>
        </fieldset>

        {error && <p className="formError" role="alert">{error}</p>}
        <div className="formActions">
          <button type="button" className="secondaryButton" onClick={onCancel}>Cancelar</button>
          <button type="submit" className="primaryButton" disabled={isSubmitting}>{isSubmitting ? "Salvando..." : "Cadastrar produto"}</button>
        </div>
      </form>
    </section>
  );
}
