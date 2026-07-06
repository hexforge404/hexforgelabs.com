# Store Conversion Backlog

Date: 2026-07-05  
Repo: `hexforge404/hexforgelabs.com`  
Source audit docs:

- `docs/audits/storefront-route-and-order-flow-map-2026-07-05.md`
- `docs/audits/store-conversion-function-audit-2026-07-05.md`

## Use this doc like a Notion task board

Legend:

- 🔴 High = must fix before pushing more traffic
- 🟡 Medium = this week / next cleanup pass
- 🟢 Low = later polish

## Conversion backlog

| Status | Priority | Task | Related Project | Notes |
|---|---|---|---|---|
| Not Started | 🔴 High | Fix cylinder size labels | Lithophane Store | Current labels show 4/6/8 inches; owner notes suggest 6/8/10.5 for cylinder. |
| Not Started | 🔴 High | Confirm globe physical size labels | Lithophane Store | Do not keep 4/6/8 unless physically verified. |
| Not Started | 🔴 High | Rewrite globe upload copy | Lithophane Store | Use `Upload 1-5 images. One required; more improves coverage.` |
| Not Started | 🔴 High | Simplify pricing/deposit display | Lithophane Store | Replace repeated price blocks with one clean order summary. |
| Not Started | 🔴 High | Add clearer deposit timing copy | Lithophane Store | Explain deposit starts review/build; remaining balance due later. |
| Not Started | 🟡 Medium | Make Free Photo Check CTA more prominent | Funeral/Memorial Campaign | Add beside primary order CTA where possible. |
| Not Started | 🟡 Medium | Replace generic trust copy on lithophane pages | Lithophane Store | Use photo review, in-house print, secure checkout. |
| Not Started | 🟡 Medium | Reduce checkout friction from shipping address | Custom Orders | Consider collecting ZIP only before deposit, full address later. |
| Not Started | 🟡 Medium | Audit fallback product data | Store Catalog | Remove outdated cyber/USB/product assets from fallback displays. |
| Not Started | 🟢 Low | Add image quality preflight | Custom Orders | Resolution/face/screenshot warnings. |
| Not Started | 🟢 Low | Add tokenized customer status URL | Order Status | Replace public orderId-only lookup later. |

## Functional backlog

| Status | Priority | Task | Related Files | Reason |
|---|---|---|---|---|
| Not Started | 🔴 High | Verify frontend/backend price parity after any price change | `frontend/src/utils/pricing.js`, `backend/routes/products.js` | Pricing is duplicated. Easy to drift. |
| Not Started | 🔴 High | Add one pricing source-of-truth note | `docs/audits/` or `docs/ops/` | Prevent future “which file controls price?” confusion. |
| Not Started | 🟡 Medium | Add quote endpoint for custom order estimates | Backend products route | Lets frontend display backend-authoritative estimates. |
| Not Started | 🟡 Medium | Add smoke test for custom order price cases | Tests | Catch cylinder/globe/promo/deposit regressions. |
| Not Started | 🟡 Medium | Add smoke test for photo-check intake | Tests | Confirm lead capture stays live. |
| Not Started | 🟢 Low | Clean unused/dead upload helper code if confirmed unused | `backend/routes/products.js` | There appears to be older upload destination logic around pending folders; verify before deleting. |

## Suggested next patch sequence

### Step 1 — Fix labels/copy only

Files likely touched:

- `frontend/src/pages/ProductDetailPage.jsx`

Tasks:

- Change cylinder labels from 4/6/8 to physical approximations.
- Change globe upload copy to 1-5 images.
- Add deposit explainer sentence.
- Do not touch checkout logic.

Acceptance check:

- Build passes.
- Cylinder page shows correct size labels.
- Globe page no longer implies five images are mandatory.
- Submit still redirects to Stripe deposit checkout.

### Step 2 — Pricing summary cleanup

Files likely touched:

- `frontend/src/pages/ProductDetailPage.jsx`
- Possibly `ProductDetailPage.css`

Tasks:

- Consolidate pricing into one summary block.
- Remove duplicate total/deposit copy.
- Keep promo summary behavior.

Acceptance check:

- No duplicate confusing totals.
- Promo still shows original price, discount, new total, due now, remaining.
- Non-promo still shows total, due now, remaining.

### Step 3 — Free Photo Check lift

Files likely touched:

- `frontend/src/pages/ProductDetailPage.jsx`
- Possibly `FreePhotoCheckPage.jsx`
- Possibly funeral/memorial pages

Tasks:

- Add secondary CTA near primary order CTA.
- Add `Not sure your photos will work?` copy.
- Keep current `/api/products/photo-check` backend unchanged.

Acceptance check:

- Link carries product slug.
- Photo check submit creates reviewing-assets intake.
- No payment required for photo check.

### Step 4 — Server-side quote endpoint

Files likely touched:

- `backend/routes/products.js`
- `frontend/src/pages/ProductDetailPage.jsx`
- tests if available

Tasks:

- Add backend endpoint returning quote for productType/size/panelCount/addons/promo.
- Frontend displays backend quote once available.
- Keep local frontend calculation as temporary estimate/fallback.

Acceptance check:

- Backend and frontend totals match.
- Promo quote and submit quote match.
- Deposit amount comes from backend.

## Smoke test checklist

Use after each patch.

### Store routes

- [ ] `/store` loads product list.
- [ ] `/store/custom-lithophane-lamp-cylinder` loads detail page.
- [ ] `/store/lithophane-globe-lamp` loads detail page.
- [ ] `/free-photo-check` loads.
- [ ] `/funeral-homes` loads.
- [ ] `/memorial` loads.
- [ ] `/portfolio` loads.

### Custom order cases

- [ ] Cylinder small, 2 photos, no add-ons = expected total.
- [ ] Cylinder medium, 3 photos, nightlight = expected total/deposit.
- [ ] Globe with 1 image submits.
- [ ] Globe with 5 images submits.
- [ ] Family bundle requires exactly 4 images.
- [ ] Nightlight requires 1 image.
- [ ] Box orders reject unsupported add-ons.

### Checkout/payment

- [ ] Custom order returns `checkoutUrl` when Stripe is configured.
- [ ] Stripe checkout amount equals deposit, not full total.
- [ ] Success URL includes `orderId` and `sessionId`.
- [ ] Webhook updates custom order to `deposit_paid`.
- [ ] Standard cart checkout still works.

### Photo check

- [ ] Requires name.
- [ ] Requires email or phone.
- [ ] Requires at least one image.
- [ ] Creates `intakeType: photo_check`.
- [ ] Sets status to `reviewing_assets`.

## Suggested conversion copy snippets

### Product page helper

```text
Not sure your photos will work? Send them for a free photo check before ordering.
```

### Deposit explainer

```text
Your 50% deposit starts the custom review/build process. The remaining balance is due after approval or before shipping.
```

### Globe upload helper

```text
Upload 1-5 images. One image is required. More images create better wrap coverage. If you upload fewer than 5, we can use a moon-style background to fill empty space.
```

### Cylinder photo helper

```text
Upload 2-5 photos. Portraits and close-up images usually produce the best glow and detail.
```

## Stop-doing list

- Do not add more product SKUs until current custom pages are clear.
- Do not redesign the whole site before fixing size/copy/pricing clarity.
- Do not rely on frontend pricing alone.
- Do not make memorial customers guess whether their photos are good enough.
- Do not ship public traffic to product pages with unverified dimensions.

## Owner decision needed

| Decision | Needed before patch? | Recommendation |
|---|---:|---|
| Final cylinder sizes | Yes | Use 6 / 8 / 10.5 if physically true. |
| Globe pricing | Yes | Decide whether globe should stay 50/60/70 or move to 35/45/55. |
| Globe physical sizes | Yes | Measure before replacing labels. |
| Shipping before deposit | No | Can start with copy cleanup first. |
| Quote endpoint | No | Do after quick conversion fixes. |

## Next best move

Patch `ProductDetailPage.jsx` copy/labels first. That is the fastest conversion win with the least chance of breaking checkout.

Small cuts. Clean blade. No rebuild rabbit hole.
