# Merchant mobile — Design QA

- Source visual truth: `public/prototype/reference.jpg`
- Browser-rendered implementation: `docs/evidence/mobile-home-browser.jpg`
- Side-by-side evidence: `docs/evidence/mobile-home-comparison.jpg`
- Viewport: 390 × 844 CSS px; capture includes the 1 px iframe border and resulted in 392 × 846 px.
- Source pixels: 711 × 1536, normalized with a centered cover fit to 392 × 846 px.
- Implementation pixels: 392 × 846 at device scale factor 1.
- State: signed-in home with three example reviews.

## Findings

No actionable P0, P1, or P2 mismatch remains.

The visual hierarchy, product density, background, purple accent, search prominence, product imagery, semantic repurchase colors, typography scale and fixed bottom navigation follow the selected concept. The implementation intentionally uses “Avaliações recentes” and “Minhas avaliações” because the current domain records reviews rather than purchases. It introduces “Início” because the agreed mobile information architecture has three destinations. Camera barcode scanning was added later as a full-screen reader opened from the barcode search mode and the GTIN field (ADR-0014 in the API repository).

### Required fidelity surfaces

- Fonts and typography: Arial/Helvetica provides the neutral grotesk character of the reference. Weight, scale, wrapping and hierarchy match at 390 px; long product names wrap without hiding brand or measure.
- Spacing and layout rhythm: header, search, section breaks, product rows and bottom navigation align closely after two density passes. All three products remain readable with normal scrolling, and the navigation no longer covers the final comment.
- Colors and tokens: off-white background, deep purple accent, muted copy, dividers, and red/green/gray repurchase states match the reference and retain text/icons in addition to color.
- Image quality: demonstration product images are precise crops of the supplied concept. They are suitable for prototype validation and are explicitly documented as temporary assets.
- Copy and content: product names, brands, measures and review summaries match the concept where appropriate. Terminology changes reflect the actual data model.

## Responsive and interaction validation

- 320, 360, 390 and 430 px: no horizontal overflow.
- Search: name query tested with two distinguishable Doritos sizes.
- Product detail: tested with and without a personal review.
- Review: required-field validation, all three steps and successful publication tested.
- Product registration: duplicate detection tested while preserving form values.
- Console: no application-origin warnings or errors; browser-extension messages were excluded.

## Comparison history

1. Initial pass: product images were blank in the embedded preview because the absolute image positioning escaped the clipping frame. Fixed by using the concept as a background crop.
2. Second pass: vertical density hid most of the third product. Reduced row padding, image height and type scale while preserving touch targets.
3. Third pass: 320 px had 15 px of horizontal overflow from the embedded scrollbar. Hidden the document scrollbar in preview mode and rechecked all four widths.
4. Final pass: reduced the fixed navigation height so the last review comment remains visible.

Focused-region comparison was unnecessary after the equal-size side-by-side pass: the source and implementation are both single-column 390 px screens, and product typography, badges and imagery remain legible in the full-view evidence.

final result: passed
