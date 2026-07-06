# Storefront Route and Order Flow Map

Date: 2026-07-05  
Repo: `hexforge404/hexforgelabs.com`  
Scope: documentation-only audit of storefront routes, custom order flow, checkout/deposit behavior, and high-impact functional notes.

## What this doc is for

Use this as the fast map before editing the store. It shows where customer traffic enters, how custom products resolve into order types, where pricing is calculated, and where money moves.

## Frontend route map

Source: `frontend/src/App.jsx`

| Route | Component | Purpose | Notes |
|---|---|---|---|
| `/` | `HomePage` | Main landing page | Primary brand entry. |
| `/store` | `ProductList` inside `StorePage` | Store catalog | Includes cart drawer and floating cart button. See `App.jsx:L28-L39`. |
| `/store/:slug` | `ProductDetailPage` | Product detail/custom order page | Main conversion route for lithophane products. See `App.jsx:L39`. |
| `/order/:orderId` | `OrderStatusPage` | Public order status | Standard/customer order status route. See `App.jsx:L40`. |
| `/success` | `SuccessPage` | Standard Stripe success | Standard cart checkout return route. See `App.jsx:L70`. |
| `/custom-order-success` | `CustomOrderSuccessPage` | Custom order Stripe success | Deposit checkout return route. See `App.jsx:L71`. |
| `/funeral-homes`, `/funeral-home`, `/funeralhome` | `FuneralHomePage` | Director-facing memorial campaign page | Three aliases point to same page. See `App.jsx:L97-L99`. |
| `/memorial` | `MemorialPage` | Family-facing memorial campaign page | Uses memorial guide instead of floating chat. See `App.jsx:L100` and `App.jsx:L117-L121`. |
| `/free-photo-check` | `FreePhotoCheckPage` | Pre-order image review | Strong conversion bridge for hesitant buyers. See `App.jsx:L101`. |
| `/portfolio`, `/work` | `PortfolioPage`, redirect | Portfolio proof page | `/work` redirects to `/portfolio`. See `App.jsx:L102-L103`. |
| `/help` | `HelpPage` | Support/help content | See `App.jsx:L104`. |
| `/admin`, `/orders`, `/admin/work-order/:orderId` | Admin gated pages | Admin order management | Protected by `AdminRoute`. See `App.jsx:L42-L67`. |
| `/login`, `/register`, `/account` | Member auth/account | Customer/member account layer | `/account` redirects to `/login` when no member. See `App.jsx:L81-L95`. |
| `/heightmap`, `/surface` | Tool/product generation pages | Surface/heightmap engines | Useful for future product pipeline. See `App.jsx:L78-L79`. |

## Product detail resolution map

Source: `frontend/src/pages/ProductDetailPage.jsx`

`ProductDetailPage` resolves SKU or route slug into a custom `productType`.

| SKU / slug | Resolved type | Behavior |
|---|---|---|
| `LITHCYL01` or `custom-lithophane-lamp-cylinder` | `cylinder` | Cylinder configurator, 2-5 photos, size, image style, lighting, nightlight add-on. |
| `LITHMUL02` or `multi-panel-lithophane-lamp` | `panel` | Panel configurator, 2-5 panels, diffuser add-on. |
| `LITHBOX03` or `lithophane-box` | `fixedBox4` | Four-sided box order. |
| `LITHBOX05` or `five-sided-lithophane-panel-box` | `panelBox5` | Five-sided panel box. |
| `LITHGLB04` or `lithophane-globe-lamp` | `globeLamp` | Globe configurator, 1+ image accepted on submit, up to 5 shown in upload UI. |
| `LITHBUNDLE01` or `custom-family-lithophane-bundle` | `familyBundle4` | Requires exactly 4 images. |
| `LITHNL01` or `lithophane-night-light` | `nightlight` | One-photo nightlight order. |
| `LITHDF01` or `lithophane-diffuser-insert` | `null` | Diffuser is intentionally not treated as a custom lamp order. |

Important source points:

- SKU/slug mapping lives in `resolveProductType()` at `ProductDetailPage.jsx:L217-L234`.
- Initial custom order state contains product-specific nested settings at `ProductDetailPage.jsx:L146-L198`.
- Add-on state is normalized by product type in `getActiveAddons()` at `ProductDetailPage.jsx:L336-L349`.

## Frontend custom order flow

Source: `frontend/src/pages/ProductDetailPage.jsx`

1. Customer opens `/store/:slug`.
2. Page fetches product by slug from `/api/products/slug/:slug`; if the API fails or 404s, it tries store/memorial fallback product data. See `ProductDetailPage.jsx:L191-L252`.
3. Product type is resolved from SKU/slug.
4. Page calculates a live frontend total using `calculatePrice()` and selected options. See `ProductDetailPage.jsx:L26-L72` in the later render section.
5. Page displays total, 50% deposit due now, and remaining balance. See `ProductDetailPage.jsx:L5-L39` in the final pricing summary section.
6. Submit is disabled until required images are present. See `ProductDetailPage.jsx:L64-L76` in the final submit section.
7. Submit sends `FormData` to `/api/products/custom-orders` with `X-Idempotency-Key`. See `ProductDetailPage.jsx:L167-L176` in `handleCustomOrderSubmit()`.
8. If backend returns `checkoutUrl`, browser redirects to Stripe. See `ProductDetailPage.jsx:L192-L194` in `handleCustomOrderSubmit()`.

## Backend custom order flow

Source: `backend/routes/products.js`

1. Custom order endpoint is `POST /api/products/custom-orders`.
2. Upload fields accepted:
   - `images[]`, max 5
   - `images`, max 5
   - `nightlightImage`, max 1
   See `products.js:L151-L157` in the custom order endpoint block.
3. Backend builds idempotency key from request header plus payload fields. See `products.js:L185-L199` in the custom order endpoint block.
4. If duplicate idempotency key exists, backend returns existing order data and tries to retrieve the existing Stripe checkout URL. See `products.js:L201-L237` in the custom order endpoint block.
5. Backend normalizes product type, required panels, add-ons, extras, panel image list, and upload counts. See `products.js:L292-L324` in the custom order endpoint block.
6. Backend enforces image requirements and shipping address. See `products.js:L6-L20` in the final validation block.
7. Backend calculates original price, promo discount, 50% deposit, and remaining balance. See `products.js:L62-L162` in the pricing/promo block.
8. Backend creates `CustomOrder` with `paymentMethod: stripe`, `paymentStatus: pending`, `status: awaiting_deposit`, and `fulfillmentStatus: awaiting_deposit`. See `products.js:L223-L288`.
9. If Stripe is configured, backend creates a Checkout Session for deposit only. See `products.js:L304-L333` and `products.js:L3-L20` in the Stripe session continuation.
10. Backend returns `checkoutUrl`, `sessionId`, total, deposit, remaining balance, and order status. See `products.js:L60-L90` in the response payload block.

## Standard cart checkout flow

Source: `backend/routes/payments.js`

1. Standard checkout endpoint is `POST /api/payments/create-checkout-session`.
2. Items are validated to include product id, `_id`, or slug, and quantity >= 1. See `payments.js:L110-L127`.
3. Products are resolved server-side from Mongo by ID or slug. See `payments.js:L142-L175`.
4. Stripe session line items use server-side product price, not frontend-submitted price. See `payments.js:L237-L249`.
5. Standard checkout success route is `/success?orderId=<orderId>`. See `payments.js:L12-L20` in session creation continuation.
6. Order record is saved after Stripe session creation. See `payments.js:L36-L80` in the order save continuation.

## Stripe webhook flow

Source: `backend/routes/payments.js`

- Webhook endpoint: `POST /api/payments/webhook`.
- Signature verification requires `STRIPE_WEBHOOK_SECRET`. See `payments.js:L186-L206`.
- Supports `checkout.session.completed` and `payment_intent.succeeded`. See `payments.js:L233-L246`.
- Updates standard orders to `paid` / `processing`. See `payments.js:L268-L282`.
- Updates custom orders to `deposit_paid`, sets fulfillment state, and records deposit timestamp. See `payments.js:L285-L303`.
- Logs webhook events in `StripeWebhookEvent`, including failures and ignored event types. See `payments.js:L125-L184` and `payments.js:L342-L355`.

## Free Photo Check flow

Source: `backend/routes/products.js`

- Endpoint: `POST /api/products/photo-check`.
- Accepts up to 5 uploaded images. See `products.js:L7-L12` in the photo-check block.
- Requires name and at least one contact method. See `products.js:L30-L41`.
- Requires at least one image. See `products.js:L42-L44`.
- Saves as `CustomOrder` with `intakeType: photo_check`, zero pricing, `paymentMethod: manual`, and `status: reviewing_assets`. See `products.js:L92-L131`.

## Functional risks found

### P1 — Customer-facing size labels are probably wrong for cylinder/globe

Frontend cylinder and globe configurators still show:

- Small `(4" height)`
- Medium `(6" height)`
- Large `(8" height)`

Sources:

- Globe labels: `ProductDetailPage.jsx:L123-L136`.
- Cylinder labels: `ProductDetailPage.jsx:L178-L188`.

Owner notes say cylinder physical labels should likely be closer to `6 / 8 / 10.5`, with large reference around 10.5 inches. This is a conversion problem because buyers are choosing physical size from potentially false labels.

### P1 — Globe upload count messaging is mixed

The render logic sets globe `requiredPanelCount` to 5, which creates five upload slots, but submit validation accepts at least one globe image.

Sources:

- Render-side globe upload slot count: `ProductDetailPage.jsx:L9-L21` in render section.
- Submit-side globe validation accepts at least one image: `ProductDetailPage.jsx:L39-L49` in submit handler.
- Backend accepts globe min 1 / max 5: `products.js:L304-L307` in custom order block.

Suggestion: keep the flexibility, but change copy to say: `Upload 1-5 images. One is required; more images improve coverage.`

### P1 — Full shipping address before deposit adds friction

Frontend requires full shipping address before starting the order. Backend also requires it before checkout.

Sources:

- Frontend shipping validation: `ProductDetailPage.jsx:L81-L84` in submit handler.
- Backend shipping validation: `products.js:L6-L10` in final validation block.

This protects fulfillment, but it is heavy before image review. For custom/memorial products, consider letting the customer start with name/email/phone + ZIP, then collect full address after deposit or during approval.

### P1 — Deposit math is duplicated frontend/backend

Frontend calculates `customOrderTotal * 0.5`; backend uses `calculateDeposit(discountedTotal)`.

Sources:

- Frontend display: `ProductDetailPage.jsx:L74` and final pricing summary `ProductDetailPage.jsx:L20-L31`.
- Backend final deposit calculation: `products.js:L161-L162`.

Current behavior appears aligned, but duplication increases risk after promo, pricing, or deposit policy changes. Backend should remain source of truth; frontend should present estimates until server confirmation.

### P2 — Fallback products can hide stale catalog data

Product detail falls back to local store/memorial fallback data when API fetch fails. See `ProductDetailPage.jsx:L191-L252`.

This is good for uptime, but dangerous if old cyber/USB assets or outdated product copy remain in fallback data. Add a periodic fallback audit checklist.

### P2 — CTA/subtotal area repeats money several ways

The page can show:

- Hero start price
- Main price
- Deposit subtext
- Product custom summary
- Total row
- Submit note

Sources:

- Hero/deposit copy: `ProductDetailPage.jsx:L100-L108`.
- Main price/subtext: `ProductDetailPage.jsx:L224-L232`.
- Pricing summary: `ProductDetailPage.jsx:L5-L39` in final summary.
- Total + submit note: `ProductDetailPage.jsx:L41-L79` in final section.

Suggestion: reduce to one clean pricing panel: `Total`, `Due today`, `Due after approval`, `Secure checkout`.

## Recommended next docs to keep updated

- `docs/audits/store-conversion-function-audit-2026-07-05.md`
- `docs/ops/store-conversion-backlog-2026-07-05.md`

## Bottom line

The order path is functional and reasonably protected: server-side pricing exists, Stripe deposit checkout exists, webhooks update deposit status, free photo check captures pre-order leads, and idempotency reduces duplicate orders.

The biggest near-term gains are conversion polish, not architecture surgery:

1. Fix size labels.
2. Simplify globe image-count copy.
3. Reduce checkout friction before deposit.
4. Consolidate pricing display.
5. Keep backend pricing as source of truth.
