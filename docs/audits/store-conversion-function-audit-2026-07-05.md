# Store Conversion and Function Audit

Date: 2026-07-05  
Repo: `hexforge404/hexforgelabs.com`  
Scope: storefront conversion, custom order behavior, product pricing, checkout/deposit path, and function-impacting backlog.

## Executive read

The store is not dead weight. The core custom-order path is wired:

- Product detail pages resolve product type from SKU/slug.
- Frontend shows live pricing and deposit estimate.
- Backend validates uploads/customer/shipping.
- Backend calculates final price, promo, deposit, and remaining balance.
- Stripe deposit checkout is created for custom orders.
- Webhooks update custom orders to `deposit_paid`.
- Free Photo Check creates zero-dollar review intakes.

The biggest conversion leaks are copy/UX consistency issues:

1. Size labels still appear to be wrong for cylinder/globe.
2. Globe image requirements are flexible in code but confusing in UI.
3. Full shipping address is required before deposit, which increases friction.
4. Pricing/deposit messaging is repeated in too many places.
5. Trust claims need to stay real and specific.

## Evidence map

| Area | Source |
|---|---|
| React route table | `frontend/src/App.jsx:L25-L108` |
| Product type resolver | `frontend/src/pages/ProductDetailPage.jsx:L217-L234` |
| Frontend pricing helper | `frontend/src/utils/pricing.js:L20-L58` |
| Frontend custom order submit | `frontend/src/pages/ProductDetailPage.jsx:L16-L259` in `handleCustomOrderSubmit()` section |
| Backend custom order endpoint | `backend/routes/products.js:L151-L183` and continuation blocks |
| Backend custom order pricing | `backend/routes/products.js:L192-L217` |
| Backend promo preview | `backend/routes/products.js:L233-L350` |
| Backend Stripe deposit checkout | `backend/routes/products.js:L304-L333` and continuation |
| Standard checkout | `backend/routes/payments.js:L177-L260` and continuation |
| Stripe webhook | `backend/routes/payments.js:L186-L355` |
| Free Photo Check | `backend/routes/products.js:L7-L140` in photo-check block |

## Conversion audit

### 1. Size selection is the top fix

Current frontend labels:

- Panel configurator: Small 4", Medium 6", Large 8".
- Globe configurator: Small 4", Medium 6", Large 8".
- Cylinder configurator: Small 4", Medium 6", Large 8".

Sources:

- Panel size labels: `ProductDetailPage.jsx:L33-L44`.
- Globe size labels: `ProductDetailPage.jsx:L126-L136`.
- Cylinder size labels: `ProductDetailPage.jsx:L178-L188`.

Problem:

Owner notes indicate cylinder physical labels should likely be closer to `6 / 8 / 10.5`, with large reference around 10.5 inches. A buyer choosing a memorial lamp needs confidence. Wrong dimensions create hesitation, refunds, or awkward follow-up.

Recommendation:

- Replace generic `4 / 6 / 8` labels for cylinder and globe with product-specific labels.
- Use plain copy: `Small`, `Medium`, `Large` plus approximate finished height.
- Add `Approximate size; final dimensions may vary slightly by photo layout and base.`

Suggested customer-facing labels:

| Product | Small | Medium | Large |
|---|---:|---:|---:|
| Cylinder | ~6 in | ~8 in | ~10.5 in |
| Globe | TBD after physical validation | TBD | TBD |
| Panel lampshade | Keep only if physically true | Keep only if true | Keep only if true |

Status: **P1 / conversion + trust**

### 2. Globe upload flow is flexible but confusing

Current behavior:

- Render-side required slot count sets globe to 5 upload slots.
- Submit-side validation accepts at least one globe image.
- Backend accepts globe min 1 and max 5.

Sources:

- Render-side upload slots: `ProductDetailPage.jsx:L9-L21` in render section.
- Frontend submit validation: `ProductDetailPage.jsx:L39-L49` in submit handler.
- Backend min/max images: `products.js:L304-L307` in custom order endpoint.

Problem:

The UI says/forms behave like five images are expected, while actual validation says one image is enough. That mismatch makes customers wonder if they are doing it wrong.

Recommendation:

Use copy like:

> Upload 1-5 images. One image is required. More images give better wrap coverage. If you upload fewer than 5, we can use a moon-style background to fill the empty space.

Status: **P1 / conversion clarity**

### 3. Free Photo Check is a strong conversion bridge

Current behavior:

- Product detail page links lamp products to `/free-photo-check?product=<slug>`.
- Photo Check backend creates a `CustomOrder` with `intakeType: photo_check`, zero total, and `reviewing_assets` status.

Sources:

- Product detail link: `ProductDetailPage.jsx:L235-L243`.
- Backend photo-check creation: `products.js:L92-L140` in photo-check block.

Why it matters:

Custom lithophanes are image-quality dependent. Customers may hesitate because they do not know whether their photos will work. Free Photo Check removes that fear before checkout.

Recommendation:

Make Free Photo Check more visible:

- Put it above the upload form on every custom product.
- Add it to funeral/memorial campaign pages.
- Use a CTA split:
  - `Start My Order`
  - `Not sure? Get a Free Photo Check`

Status: **P1 / conversion booster**

### 4. Full shipping address before deposit is probably too heavy

Current behavior:

- Frontend requires full shipping address before submission.
- Backend also requires full shipping address before creating checkout session.

Sources:

- Frontend required shipping validation: `ProductDetailPage.jsx:L81-L84` in submit handler.
- Backend required shipping validation: `products.js:L6-L10` in final custom order validation block.

Problem:

For a custom/memorial order, the customer may not be ready to fill a full shipping address before they trust the process. The deposit is already friction; full address adds another wall.

Recommendation options:

| Option | Change | Risk |
|---|---|---|
| Conservative | Keep address required, but move it below a clear `Shipping info` step header | Low |
| Better | Require name/email/phone + ZIP before deposit; collect full address after image approval | Medium |
| Best | Split order into `Photo Review -> Deposit -> Shipping` | Medium/high, but strongest UX |

Status: **P1 / checkout friction**

### 5. Pricing/deposit display is repeated too much

Current frontend can show:

- Product price.
- Start/deposit copy.
- Deposit summary.
- Total summary.
- Total row.
- Submit note.

Sources:

- Hero start text: `ProductDetailPage.jsx:L100-L108`.
- Main price and price subtext: `ProductDetailPage.jsx:L224-L232`.
- Pricing summary: `ProductDetailPage.jsx:L5-L39` in final pricing summary section.
- Total row and submit note: `ProductDetailPage.jsx:L41-L79` in final section.

Problem:

Repeated money blocks make the page feel less certain, even when math is correct.

Recommendation:

Create one pricing card:

```text
Order Summary
Total: $XX.XX
Due today: $XX.XX deposit
Due after approval: $XX.XX
Secure checkout via Stripe
```

When promo is applied:

```text
Original: $XX.XX
Discount: -$XX.XX
New total: $XX.XX
Due today: $XX.XX
Remaining: $XX.XX
```

Status: **P2 / trust polish**

### 6. Trust copy should be specific and provable

Current trust indicators include:

- `Built in-house by cybersecurity experts`
- `Direct support from the HexForge team`
- `Quality assured & tested`

Source: `ProductDetailPage.jsx:L4-L10` in trust indicators section.

Concern:

For lithophane memorial products, `cybersecurity experts` is less relevant than `built in-house`, `photo reviewed`, and `hand-finished`.

Recommendation:

Use product-specific trust text:

| Product type | Better trust copy |
|---|---|
| Lithophane | `Photo reviewed before production`, `Printed in-house`, `Secure deposit checkout` |
| Funeral/memorial | `Designed for memorial keepsakes`, `Proof review available`, `Direct owner support` |
| Cyber/USB/security | `Built/tested in-house`, `For authorized use only`, `Documentation included` |

Status: **P2 / brand fit**

## Function audit

### Pricing alignment

Frontend pricing source: `frontend/src/utils/pricing.js`.

Important values:

| Product type | Frontend base price |
|---|---:|
| Cylinder | `$35 + size + photo count` |
| Panel | `$55 + size + panel count` |
| Globe | `$50 + size` |
| Fixed box 4 | `$45` |
| Panel box 5 | `$55` |
| Family bundle 4 | `$129.99` |
| Nightlight | `$10` |
| Diffuser add-on | `$10` |
| Nightlight add-on | `$5` |

Source: `frontend/src/utils/pricing.js:L20-L58`.

Backend custom order pricing mirrors the same model. Source: `backend/routes/products.js:L192-L217`.

Finding:

Good: frontend/backend prices appear aligned for current custom products.

Risk:

Pricing is duplicated in frontend and backend. Any future change must be patched twice.

Recommendation:

- Keep backend as the authority.
- Frontend labels should say `Estimated total` until backend returns final total.
- Add a shared pricing documentation table or generated JSON contract.

Status: **P2 / maintainability**

### Deposit behavior

Current behavior:

- Backend calculates `depositAmount = calculateDeposit(discountedTotal)`.
- Backend Stripe session charges only the deposit amount.
- Stripe line item name says `Deposit for <product title>`.
- Success route goes to `/custom-order-success?orderId=...&sessionId=...`.

Sources:

- Deposit calculation: `products.js:L161-L162`.
- Stripe deposit line item amount: `products.js:L3-L8` in session continuation.
- Success/cancel URLs: `products.js:L11-L12` in session continuation.

Finding:

This is solid. It matches the desired custom-order model.

Recommendation:

Add a short sentence near submit:

> Your deposit starts the review/build process. Remaining balance is due after approval or before shipping.

Status: **Keep / polish copy**

### Upload validation

Current frontend:

- File must be image.
- Max 10 MB.
- Recommended 3000x3000 or larger.

Sources:

- Upload validation: `ProductDetailPage.jsx:L75-L88`.
- Upload helper copy: `ProductDetailPage.jsx:L119-L130`.

Current backend:

- Multer max 10 MB.
- Only image MIME types allowed.

Sources:

- Backend upload filter: `products.js:L48-L60`.

Finding:

Good baseline. Add image dimension/quality scoring later if possible.

Recommendation:

Add future photo-quality preflight:

- Detect low resolution.
- Detect tiny face/photo subject.
- Warn on screenshots/social overlays.
- Offer Free Photo Check automatically when image quality is risky.

Status: **P3 / future conversion tool**

### Order status privacy

Current public custom order lookup is intentionally redacted and excludes images/customer/session data.

Sources:

- TODO comment and redacted response: `products.js:L101-L124` in custom order lookup block.
- Safe response fields: `products.js:L125-L140`.

Finding:

Good containment. The TODO is correct: customer access token would be better than public orderId lookup.

Recommendation:

- Keep current redaction.
- Later add tokenized order status URL.
- Do not expose image paths or customer data.

Status: **P2 / security improvement**

## Quick-win patch list

### High impact / low risk

1. Update cylinder size labels to physically accurate approximations.
2. Change globe upload copy to `1-5 images`.
3. Replace generic lithophane trust copy with product-specific trust copy.
4. Simplify pricing display into one summary card.
5. Add one sentence explaining deposit/remaining balance timing.

### Medium impact / medium risk

1. Make shipping address optional until after image review/deposit.
2. Move pricing to a shared backend-served quote endpoint.
3. Add a customer status token instead of public orderId-only lookup.
4. Add better photo-quality checks.

### Do not chase yet

1. Full redesign.
2. Rebuilding checkout.
3. Reworking product schema before copy/pricing issues are cleaned up.
4. Adding more products before current product pages are sharper.

## Suggested A/B copy for product CTA

Current style is energetic and on-brand, but the customer needs less fire and more certainty at payment time.

Recommended button set:

```text
Primary: Start My Custom Order
Secondary: Get a Free Photo Check First
```

Submit note:

```text
50% deposit today • Secure Stripe checkout • Photo review before production
```

## Bottom line

Functionally, the custom-order engine is usable. The store’s next lift is customer confidence:

- Correct product dimensions.
- Clear image requirements.
- Cleaner deposit explanation.
- Less repeated pricing noise.
- More obvious Free Photo Check path.

Do those before chasing a big redesign. The machine is wired; now sharpen the blade.
