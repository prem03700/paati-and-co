# API reference

Base URL: `http://localhost:4000/api`

Admin endpoints use `Authorization: Bearer <accessToken>`.

## Catalogue
- `GET /products?page=1&limit=24&category=<categoryId>&search=term`
- `GET /products/:id`
- `GET /categories`
- Admin: `POST/PATCH/DELETE /products`
- Admin: `POST/PATCH/DELETE /categories`

## Orders
- `POST /orders` — public COD checkout. Body includes:
  - `items`: array of `{ product, variantId, quantity }`
  - `customerSnapshot`: `{ name, email, phone }`
  - `shippingAddress`: `{ line1, line2, city, state, postalCode }`
  - `paymentMethod`: `"cod"` only (the API rejects other values)
- Admin: `GET /orders`, `GET /orders/:id`
- Admin: `PATCH /orders/:id/status` — `{ "status": "processing", "note": "..." }`
- Admin: `PATCH /orders/:id/notes`

COD orders are created with `paymentStatus: "pending"`. Mark payment as collected only after cash is received. Order states: `placed → confirmed → processing → packed → shipped → delivered`; `cancelled` is terminal. Cancelling restocks line items.

## Inventory
- Admin: `GET /inventory`
- Admin: `GET /inventory/logs`
- Admin: `PATCH /inventory/:productId/:variantId` — `{ "change": 10, "reason": "Supplier delivery" }`

## Customers and dashboard
- Admin: `GET /customers?search=term`
- Admin: `GET /customers/:id/orders`
- Admin: `PATCH /customers/:id`
- Admin: `GET /dashboard/summary`

## Health
- `GET /health`

## Payments
Cash on Delivery is the only supported method. Online payment processing is not implemented.

## Customer account endpoints

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Create customer account |
| POST | `/api/auth/customer-login` | Public | Customer-only sign in for storefront |
| POST | `/api/auth/login` | Public | Admin and general sign in |
| POST | `/api/auth/refresh` | Refresh cookie | Rotate access and refresh tokens |
| POST | `/api/auth/logout` | Refresh cookie | Revoke current refresh token |
| GET | `/api/auth/me` | Authenticated | Read own profile |
| PATCH | `/api/auth/me` | Authenticated | Update own name and phone |
| GET | `/api/orders/mine` | Customer | List only the signed-in customer's orders |

Registration body: `{ "name": "Customer Name", "email": "customer@example.com", "phone": "9999999999", "password": "minimum-8-chars" }`.

Customer checkout attaches the authenticated customer ID to the order. Guest checkout is still supported. Only `paymentMethod: "cod"` is accepted.

| POST | `/api/uploads/image` | Admin | Upload one JPG, PNG or WEBP image (raw file body, max 5 MB); returns a storefront image URL |

Product create/update supports `images` as an array of image URLs or local storefront paths, and `variants` as an array of size/option, SKU, price, stock and active-state objects. Product-editor stock changes are recorded in inventory logs. Existing variants with remaining stock cannot be removed.
