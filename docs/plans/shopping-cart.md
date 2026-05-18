# Plan: Shopping Cart + Multi-item Checkout

## Context

Today every purchase is **one product per booking**:
- Patient picks one Health Test → fills booking form → Stripe → 1 Appointment row
- Patient picks one Online Prescription → same flow
- Patient picks one Consultation → same flow + time slot

Patients have asked to **add multiple items to a cart** and check out in one transaction — same UX as any e-commerce store.

## Items eligible for cart

| Item | Today's model | Add to cart? |
|---|---|---|
| **Health Test** | `HealthTest` row, orderable kit | ✅ Yes |
| **Online Prescription** | `Service.kind = PRESCRIPTION` | ✅ Yes |
| **General Consultation** | `Service.kind = GENERAL` + time slot | ✅ Yes — slot picker at checkout |
| **Specialist Consultation** | `Service.kind = SPECIALIST` + time slot + specialty | ✅ Yes — slot picker at checkout |
| **Clinical Prescription** | `Prescription` issued by doctor | ❌ No — given, not bought |

**v1 ship**: Health Test + Online Prescription only (pure products, no slot complexity).
**v2 ship**: Consultations join the cart (handles per-item slot picker).

---

## Architecture

### Data model (Prisma)

```prisma
enum CartItemKind {
  HEALTH_TEST
  PRESCRIPTION_SERVICE
  GENERAL_CONSULTATION   // v2
  SPECIALIST_CONSULTATION // v2
}

enum OrderStatus {
  PENDING        // cart finalized, awaiting payment
  PAID           // Stripe confirmed
  FULFILLED      // shipped / delivered
  CANCELLED
  REFUNDED
}

model Cart {
  id           String     @id @default(cuid())
  userId       String?    @unique   // null = guest cart by cookie token
  cookieToken  String?    @unique   // anonymous identifier
  countryCode  String                // locks currency
  currencyCode String
  items        CartItem[]
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt
}

model CartItem {
  id              String       @id @default(cuid())
  cartId          String
  cart            Cart         @relation(fields: [cartId], references: [id], onDelete: Cascade)
  kind            CartItemKind
  // Polymorphic refs — only one populated per row
  healthTestId    String?
  serviceId       String?
  // Snapshot at add time (so price changes don't surprise checkout)
  name            String
  unitPriceCents  Int
  quantity        Int          @default(1)
  // v2 — for consultations
  timeSlotId      String?      @unique
  doctorId        String?
  createdAt       DateTime     @default(now())

  @@unique([cartId, healthTestId])    // one slot for the same test
  @@unique([cartId, serviceId])
}

model Order {
  id                 String       @id @default(cuid())
  userId             String?
  email              String
  fullName           String
  phone              String?
  countryCode        String
  currencyCode       String
  subtotalCents      Int
  shippingCents      Int          @default(0)
  totalCents         Int
  status             OrderStatus  @default(PENDING)
  paymentStatus      String       @default("UNPAID")
  stripeSessionId    String?      @unique
  paidAt             DateTime?
  // Shipping address
  shipName           String?
  shipLine1          String?
  shipLine2          String?
  shipCity           String?
  shipPostalCode     String?
  shipCountryCode    String?
  // Optional consultation appointment refs (v2)
  appointmentIds     String[]
  items              OrderItem[]
  createdAt          DateTime     @default(now())
  updatedAt          DateTime     @updatedAt
}

model OrderItem {
  id              String       @id @default(cuid())
  orderId         String
  order           Order        @relation(fields: [orderId], references: [id], onDelete: Cascade)
  kind            CartItemKind
  healthTestId    String?
  serviceId       String?
  name            String       // snapshot
  unitPriceCents  Int          // snapshot
  quantity        Int
  lineTotalCents  Int          // unitPrice × qty
}
```

### Cart persistence

| State | Storage |
|---|---|
| Guest (not logged in) | `Cart.cookieToken` — uuid in httpOnly cookie `gh_cart`, DB-backed |
| Logged in | `Cart.userId` — DB-backed |
| Login event | Merge cookie cart into user cart (server action on login) |

Why DB-backed even for guests: survives Stripe redirect, syncs across tabs, and gives admin visibility into abandoned carts.

### Currency / country lock

- First item added stamps `Cart.countryCode` + `Cart.currencyCode`.
- Adding from a different country → **block + show toast** "Your cart has Ireland items. Clear cart to switch country?"
- Switching country in header (with non-empty cart) → confirmation prompt.

### Stripe

- One `Checkout.Session` per Order with multi-line `line_items`:
  ```ts
  line_items: orderItems.map(i => ({
    price_data: {
      currency: order.currencyCode.toLowerCase(),
      product_data: { name: i.name },
      unit_amount: i.unitPriceCents,
    },
    quantity: i.quantity,
  }))
  ```
- `metadata.orderId` carries our id.
- Existing `payment.webhook` route extends to handle Order rows alongside Appointment rows (branch on `metadata.kind = "order" | "appointment"`).

---

## Backend endpoints

### Cart
| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/cart` | Read current cart (cookie-bound or user-bound) |
| `POST` | `/api/cart/items` | Add item — body: `{ kind, healthTestId?, serviceId?, quantity? }` |
| `PATCH` | `/api/cart/items/:itemId` | Update quantity |
| `DELETE` | `/api/cart/items/:itemId` | Remove item |
| `DELETE` | `/api/cart` | Empty cart |
| `POST` | `/api/cart/checkout` | Promote cart → Order, create Stripe session, return URL |

### Orders
| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/account/orders` | Patient — list own orders |
| `GET` | `/api/account/orders/:id` | Patient — order detail |
| `GET` | `/api/admin/orders` | Admin — list (filters: status, country, date) |
| `PATCH` | `/api/admin/orders/:id` | Admin — fulfill / cancel / refund |
| `POST` | `/api/payments/webhook` | **Extended** to handle order Stripe events |

---

## Frontend

### New pages
- `/cart` — review, edit qty, remove, "Continue shopping" / "Checkout" buttons
- `/checkout` — shipping address form + order summary + Stripe handoff
- `/checkout/success?orderId=…` — confirmation + Order detail
- `/checkout/cancelled` — return-to-cart page
- `/account/orders` — order history list
- `/account/orders/:id` — order detail (items, status, tracking)
- `/admin/orders` — fulfillment queue
- `/admin/orders/:id` — admin order detail

### Header changes
- New `<CartIcon>` in header (next to country/lang switcher + sign-in)
  - Shows badge with item count
  - Click → `/cart`
- Cart count fetched once per page-load (server) + updated optimistically on add

### Catalog page changes
- Health Test cards (`/[country]/[lang]/tests`):
  - Replace "Book online" button with **"Add to cart"** (with `+` icon)
  - On add: toast "Added to cart · 2 items in cart" with View cart link
- Online Prescription cards (`/[country]/[lang]/prescriptions`):
  - Same treatment
- Consultation cards (general + specialist):
  - **v1**: Keep "Book online" (no cart) — links to current single-item flow
  - **v2**: Same "Add to cart" pattern; checkout opens slot picker per consultation item

### Sidebar (patient portal)
Add **"My orders"** below **"Payments"** in `account/layout.tsx`.

---

## Phasing (suggested)

### Phase 1 — Products v1 (~1.5 days)
1. Prisma: `Cart` + `CartItem` + `Order` + `OrderItem` + enums + DB push
2. Backend cart routes (5 endpoints) + cookie middleware
3. Backend `checkout` action — creates Order + Stripe Session
4. Backend webhook extension — branch on `metadata.kind`
5. Frontend `<CartIcon>` in header + `useCart` client hook
6. "Add to cart" buttons on Health Test + Online Prescription cards
7. `/cart` page + `/checkout` shipping form
8. Stripe Checkout success/cancel pages
9. `/account/orders` + detail

### Phase 2 — Admin fulfillment (~½ day)
1. `/admin/orders` list + filters
2. `/admin/orders/:id` detail
3. Status transitions: PENDING → PAID (webhook) → FULFILLED (admin) → REFUNDED (admin)
4. Order audit log entries

### Phase 3 — Consultations join cart (~1 day)
1. Extend `CartItem` with `timeSlotId` + `doctorId`
2. Checkout: per-consultation slot picker step
3. On `Order.PAID`, mint Appointment rows for each consultation item
4. Link via `Order.appointmentIds`
5. Email confirmations cover both products + scheduled calls

### Phase 4 — Polish (optional)
- Save-for-later
- Coupon codes
- Abandoned-cart email
- Stock tracking (probably never — these are services)

---

## Files to add/modify

### Backend (new)
- `backend/prisma/schema.prisma` — 4 new models, 2 enums
- `backend/src/routes/cart.route.ts`
- `backend/src/routes/orders.route.ts`
- `backend/src/routes/admin-orders.route.ts`
- `backend/src/services/cart.service.ts` — merge cookie→user on login, currency lock
- `backend/src/services/checkout.service.ts` — cart → Order → Stripe Session

### Backend (modify)
- `backend/src/app.ts` — register new routes
- `backend/src/routes/payments.route.ts` — webhook handles Order events
- `backend/src/modules/auth/auth.service.ts` — merge cart on login

### Frontend (new)
- `frontend/components/cart/CartIcon.tsx` (header)
- `frontend/components/cart/AddToCartButton.tsx`
- `frontend/components/cart/CartContext.tsx` (client state)
- `frontend/lib/api/cart-api.ts`
- `frontend/lib/api/orders-api.ts`
- `frontend/app/(site)/cart/page.tsx`
- `frontend/app/(site)/checkout/page.tsx`
- `frontend/app/(site)/checkout/success/page.tsx`
- `frontend/app/(site)/checkout/cancelled/page.tsx`
- `frontend/app/(auth)/account/orders/page.tsx`
- `frontend/app/(auth)/account/orders/[id]/page.tsx`
- `frontend/app/(admin)/admin/orders/page.tsx`
- `frontend/app/(admin)/admin/orders/[id]/page.tsx`
- `frontend/app/api/cart/route.ts` (+ subpaths)
- `frontend/app/api/account/orders/route.ts`

### Frontend (modify)
- Header layout — insert `CartIcon`
- Health Test catalog cards — replace book button with add-to-cart
- Online Prescription catalog cards — same
- `account/layout.tsx` — add "My orders" sidebar item

---

## Verification

### Phase 1 happy path
1. Browse `/ireland/en/tests` → add 2 different tests + 1 prescription
2. Cart icon badge shows `3`
3. Open `/cart` → edit one qty to `2` → subtotal updates
4. Click "Checkout" → fill shipping address → click "Pay"
5. Redirect to Stripe; pay with `4242 4242 4242 4242`
6. Land on `/checkout/success?orderId=…` → order summary visible
7. `/account/orders` shows order with status `PAID`
8. Admin `/admin/orders` shows new row

### Edge cases
- [ ] Adding Portugal test to Ireland cart → blocked with prompt
- [ ] Guest adds 2 items → registers → cart preserved (merge)
- [ ] Logout → cart empty → log back in → previous cart restored
- [ ] Stripe webhook receives `checkout.session.completed` → Order flips PENDING → PAID
- [ ] Cancel from Stripe → return to `/checkout/cancelled` → cart still intact
- [ ] Refresh during checkout → cart not double-charged

---

## Open decisions

| Decision | Default suggestion |
|---|---|
| Shipping cost | Flat €5 v1; admin-configurable later |
| Tax handling | Stripe Tax in EU (deferred to phase 4) |
| Order numbering | Use cuid; show short hash to user (e.g. `#GH-A1B2C3`) |
| Empty cart icon visibility | Hide icon when cart empty, show on first add |
| Cart expiry | 30 days idle → auto-empty (cron) |

---

## Out of scope

- Inventory / stock tracking (services are infinite supply)
- Saved payment methods (Stripe Customer Portal handles)
- Wishlist / save for later
- Subscription items (recurring prescriptions could be phase 5)
- Cross-currency carts
- Real-time tax calc per region

---

## Effort summary

| Phase | Effort |
|---|---|
| 1 — Products v1 | ~1.5 days |
| 2 — Admin fulfillment | ~½ day |
| 3 — Consultations in cart | ~1 day |
| **Total to full launch** | **~3 days** |
