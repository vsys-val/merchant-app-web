import type { ProductPublic } from "./product-api";

function safeLink(value: string | null | undefined, kind: "source" | "license") {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    const allowed = kind === "source"
      ? /^(?:[a-z0-9-]+\.)?open(?:food|beauty|products)facts\.org$/.test(url.hostname)
      : url.hostname === "creativecommons.org";
    return url.protocol === "https:" && allowed && !url.username && !url.password ? value : undefined;
  }
  catch { return undefined; }
}

/** Render only supplied provenance; a hostname does not establish a license. */
export function ProductAttribution({ product, variant = "detail" }: { product: ProductPublic; variant?: "detail" | "compact" }) {
  if (!product.image_url) return null;
  const sourceUrl = safeLink(product.source_url, "source");
  const licenseUrl = safeLink(product.image_license_url, "license");
  const Tag = variant === "detail" ? "figcaption" : "span";
  return <Tag className="productAttribution">
    Foto: {product.image_source
      ? sourceUrl
        ? <a href={sourceUrl} target="_blank" rel="noopener noreferrer">{product.image_source}</a>
        : product.image_source
      : "origem não informada"}
    {product.image_license ? <> ({licenseUrl
      ? <a href={licenseUrl} target="_blank" rel="noopener noreferrer">{product.image_license}</a>
      : product.image_license})</> : " · licença não informada"}
  </Tag>;
}
