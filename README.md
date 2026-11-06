# PAATI & CO. — Storefront, Backend and Admin

A connected storefront and commerce starter using Node.js, Express, MongoDB and Mongoose. The storefront and API are served from the same origin.

## Requirements
- Node.js 20+
- MongoDB Community Server
- npm

## Setup
```bash
cp .env.example .env
# Configure MONGODB_URI, JWT secrets and admin bootstrap credentials.
npm install
npm run seed
npm run dev
```

Open:
- Storefront: http://localhost:4000/
- Admin dashboard: http://localhost:4000/admin
- API health: http://localhost:4000/api/health

MongoDB must be running before seeding or starting the server. Seed creates the admin and inserts demo categories/products if missing. It does not overwrite an existing admin password.

## Connected storefront
- Product catalogue is loaded from MongoDB through `GET /api/products`.
- Categories are loaded from `GET /api/categories`.
- Search, category filtering and price sorting operate on database products.
- Cart supports product variants and is retained in browser local storage.
- Checkout submits customer contact and delivery details to `POST /api/orders`.
- Successful checkout creates an order and decrements inventory.
- Admin order and inventory screens use the same MongoDB data.

## Payments
**Cash on Delivery (COD) is the only enabled payment method.**
- Checkout displays COD only.
- The API rejects any payment method other than `cod`.
- New COD orders have `paymentMethod: "cod"` and `paymentStatus: "pending"`.
- Payment is collected manually when the order is delivered. Do not mark an order paid until cash has actually been collected.
- No online payment gateway, card, UPI, payment intent, capture or refund flow is enabled.

## Admin
Use `BOOTSTRAP_ADMIN_EMAIL` and `BOOTSTRAP_ADMIN_PASSWORD` from `.env`. Existing admin passwords are not overwritten by the seed script.

## Important limitations before production
This is a working development starter, not a production-certified commerce system:
1. Add MongoDB transactions or a robust atomic stock reservation strategy and idempotency keys. Current multi-item order creation is not transactionally atomic and concurrent checkouts can create inventory inconsistencies.
2. Add customer accounts/order history, password reset and email/phone verification if required.
3. Add server-side schema validation, CSRF protection where cookie-authenticated flows are used, stricter CORS, and security/audit controls.
4. Configure real shipping fees, tax rules, address validation, invoices, delivery notifications and backups.
5. Add automated tests, monitoring, structured logging, HTTPS and production secrets.
6. Add image upload/storage (the product model currently stores image URLs).
7. Replace demo descriptions and placeholder branding with verified business information.

## Commands
```bash
npm run seed
npm run dev
npm run check
```

## Customer accounts

The storefront supports customer registration and sign-in independently of the admin dashboard. Customer passwords are hashed with bcrypt. Access tokens are short-lived; refresh tokens are stored as hashes and issued in an HttpOnly cookie. Customer profile endpoints require authentication. The customer order-history endpoint filters by the authenticated customer ID, so customers cannot request another customer's orders.

- `POST /api/auth/register` — create a customer account
- `POST /api/auth/customer-login` — customer-only storefront sign in
- `POST /api/auth/login` — admin/general sign in
- `POST /api/auth/refresh` — rotate refresh token
- `POST /api/auth/logout` — revoke refresh token
- `GET /api/auth/me` — current profile
- `PATCH /api/auth/me` — update name and phone
- `GET /api/orders/mine` — authenticated customer's order history

Checkout remains available to guests. When a customer is signed in, new COD orders are linked to that customer and appear in their account. COD remains the only payment method.

## Product photography

Product and category photos are served locally from `storefront/images/`. The current photographs are illustrative third-party reference images for the development demo; see `storefront/images/IMAGE_SOURCES.md`. Replace them with original or commercially licensed photography before launch.

## Product management in the admin dashboard

Open `/admin` and select **Products**. The product editor supports creating and editing product names, slugs, categories, descriptions, featured status and publication status. Add multiple variants with independent labels, SKUs, prices, stock quantities and active states. Product photography can be uploaded directly (JPG, PNG or WEBP, up to 5 MB per image) or added using image URLs. The first image becomes the primary storefront image.

Image uploads are restricted to authenticated administrators, validated by MIME type and file signature, and stored under `storefront/images/uploads/`. Product-editor stock changes are written to the inventory log. An existing variant with remaining stock cannot be removed until its stock is brought to zero.

## Customer addresses and order history

Signed-in customers can save up to 10 delivery addresses to their account. Checkout offers a saved-address selector, preselects the default address, and can save a newly entered address after a successful order. Customers can view, choose a default, or remove saved addresses from **Account → Saved addresses**. Duplicate addresses are not stored again.

Customer order history is available at `GET /api/orders/mine` and requires a valid customer access token. The storefront refreshes an expired access token using the same-origin HttpOnly refresh cookie before retrying authenticated requests. Guest checkout orders are not linked to an account and therefore do not appear in **My orders**.
