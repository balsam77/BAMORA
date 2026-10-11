# BAMORA API Scaffold

For the current production deployment procedure, see
[DEPLOYMENT.md](../../docs/DEPLOYMENT.md). The runtime uses Prisma/PostgreSQL,
Bearer-token role authorization and configurable persistent upload storage.
Payments are disabled by default in production until a separately approved activation.
Production local uploads are disabled by default for Render Free: authorized upload
requests return 503 before file processing. No upload directory is created or served.
Development retains local uploads. Enable `UPLOAD_STORAGE=local` in production only
with an approved persistent disk and absolute `UPLOAD_DIR`; never use ephemeral storage.

This NestJS app now includes complete endpoint scaffolding for customer, merchant, and super admin flows.

## Runtime

- Dev: `pnpm --filter @bamora/api dev`
- Typecheck: `pnpm --filter @bamora/api typecheck` (generates Prisma Client offline first)
- Build: `pnpm --filter @bamora/api build` (generates Prisma Client offline first)
- Start: `pnpm --filter @bamora/api start`

Default port is `4001`.

## Authorization Model

- Role header: `x-role`
- Supported values: `customer`, `merchant`, `super-admin`
- Guard: `src/common/roles.guard.ts`
- Decorator: `src/common/roles.decorator.ts`

## Endpoint Groups

- Health
  - `GET /api/health`
  - `GET /api/health/ready` (read-only table/column and connection checks; 503 on failure)

- Auth
  - `POST /api/auth/signup`
  - `POST /api/auth/login`
  - `POST /api/auth/refresh`

- Customer (role: customer)
  - `GET /api/customer/dashboard`
  - `GET /api/customer/profile`
  - `GET /api/customer/addresses`
  - `POST /api/customer/addresses`
  - `GET /api/customer/favorites`
  - `POST /api/customer/favorites/:productId/toggle`
  - `GET /api/customer/cart`
  - `POST /api/customer/cart`
  - `DELETE /api/customer/cart/:itemId`
  - `POST /api/customer/checkout`
  - `GET /api/customer/orders`
  - `GET /api/customer/notifications`
  - `POST /api/customer/reviews`
  - `GET /api/customer/search`

- Merchant (role: merchant)
  - `GET /api/merchant/dashboard`
  - `GET /api/merchant/products`
  - `POST /api/merchant/products`
  - `PATCH /api/merchant/products/:id`
  - `DELETE /api/merchant/products/:id`
  - `GET /api/merchant/orders`
  - `PATCH /api/merchant/orders/:id/status`
  - `POST /api/merchant/coupons`

- Super Admin (role: super-admin)
  - `GET /api/admin/dashboard`
  - `GET /api/admin/merchants`
  - `PATCH /api/admin/merchants/:id/status`
  - `DELETE /api/admin/merchants/:id`
  - `GET /api/admin/products`
  - `POST /api/admin/products`
  - `DELETE /api/admin/products/:id`
  - `GET /api/admin/orders`
  - `PATCH /api/admin/orders/:id/status`
  - `GET /api/admin/categories`
  - `POST /api/admin/categories`
  - `DELETE /api/admin/categories/:id`
  - `POST /api/admin/offers`
  - `POST /api/admin/broadcasts`
  - `GET /api/admin/users`
  - `PATCH /api/admin/users/:id/status`
  - `DELETE /api/admin/users/:id`
  - `GET /api/admin/support-tickets`
  - `PATCH /api/admin/support-tickets/:id/assign`
  - `PATCH /api/admin/support-tickets/:id/status`

- Uploads (roles: merchant, super-admin)
  - `POST /api/uploads/images`

- Integrations
  - `GET /api/integrations/config` (role: super-admin)
  - `POST /api/integrations/webhooks/payment`
  - `POST /api/integrations/webhooks/shipping`

## Database Integration

- Prisma schema is already defined in `prisma/schema.prisma` with users, merchants, products, variants, inventory, orders, payment, and shipping models.
- Current API uses `AuthRepository` and `CommerceRepository` backed by Prisma.
- The old mock service remains in the source but is not the active API data layer.
- A complete initial PostgreSQL migration is in `prisma/migrations`.
- `db:validate` and `db:migration:check` run offline without loading project `.env`.
- `db:migrate:deploy` is an explicit, database-writing deployment command, not part
  of build or startup. It requires separate approval. Existing databases need a
  reviewed baseline/reconciliation, not blind execution of the initial migration.
- Migration tests use disposable in-memory PostgreSQL, not the configured database.

## Future Payment/Shipping Integrations

- Integration config endpoint returns expected provider connection placeholders.
- Webhook endpoints are in place for asynchronous updates from external payment and shipping providers.
- Recommended next step: add provider-specific services and verify signatures for webhook security.
