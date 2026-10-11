# BAMORA deployment: Vercel + Render

This prepares the existing applications; it does not deploy accounts, modify database
configuration, run migrations/seeds, or activate payments. Keep the existing local
environment files private. Deploy only after reviewing and saving these source changes
to GitHub. Do not upload `uploads`, build output, or local credentials.

## Prerequisites and database

- Node.js 22 and pnpm 10.12.1 (the root `packageManager` is authoritative).
- The existing PostgreSQL database must be reachable from Render using its existing
  authorized connection, with TLS as required by its provider. A database on a personal
  computer is not automatically reachable from Render.
- Have the database owner verify that the current schema matches
  `apps/api/prisma/schema.prisma`. Startup connectivity and `SELECT 1` readiness do
  not verify all application tables.
- Production no longer performs the legacy automatic `ALTER TABLE` operations for
  order snapshots/suborder attention columns. Missing columns cause an explicit
  service-unavailable response. Do not work around this by running `db:push`,
  `db:migrate`, `db:seed`, or an ad-hoc schema update.
- The pnpm lifecycle-build allowlist is in `pnpm-workspace.yaml` and covers Prisma
  and bcrypt. It does not blanket-enable arbitrary dependency installation scripts.
  Keep dev dependencies available during builds so Prisma CLI and TypeScript exist.

## API on Render

Use a Node **Web Service** from `balsam77/BAMORA`, branch `main`. Leave Root Directory
empty (repository root). `render.yaml` is an optional Blueprint with the same settings.
Creating it provisions a paid Starter service and a 1 GB disk: approve the cost first.
Automatic deployments are disabled in the Blueprint.

| Setting | Value |
| --- | --- |
| Node | 22 |
| Build Command | `corepack enable && pnpm install --frozen-lockfile --prod=false && pnpm --filter @bamora/api db:generate && pnpm --filter @bamora/api build` |
| Start Command | `pnpm --filter @bamora/api start` |
| Health Check Path | `/api/health/ready` |
| Persistent disk mount | `/var/data/bamora/uploads` |

Set these in Render's environment/secret controls, never in committed files:

| Name | Requirement |
| --- | --- |
| `NODE_ENV` | `production` |
| `DATABASE_URL` | The existing authorized PostgreSQL connection; do not replace the local configuration or change the database. |
| `JWT_SECRET` | Random, strong secret, at least 32 characters; not a development default. |
| `CORS_ORIGINS` | Comma-separated exact HTTPS origins for deployed Customer, Merchant, Admin and Business as applicable. No paths, trailing slash or wildcard. |
| `UPLOAD_DIR` | `/var/data/bamora/uploads`, matching the persistent disk mount. |
| `PAYMENTS_ENABLED` | `false` until payment-provider approval and a separately approved activation. |
| `PORT` | Supplied by Render; the API binds to `0.0.0.0`. |
| `MERCHANT_SUBORDER_DELAY_HOURS` | Optional; retain the existing business value if configured. |

Do not change `PAYMENT_PROVIDER` or provider credentials in this deployment task.
`db:generate` only generates Prisma Client; it is not a database migration.
Render terminates HTTPS and forwards traffic to the application's assigned port.

### Persistent uploads

Startup creates the configured directory if needed and verifies write access. Upload
storage, static `/uploads/` serving and product-file cleanup share the same directory.
The mount must be a persistent disk, not merely a directory on an ephemeral filesystem.
The health endpoint cannot prove disk persistence: verify the attached disk in Render,
then upload a non-private test product image through an authorized account, redeploy
and verify its URL still works. Do not copy private existing uploads automatically.
Existing product images may need a separately authorized transfer or re-upload.

Use one API instance with this local-disk design. Multi-instance scaling requires a
separately designed shared/object storage backend. Back up the disk and database
according to their providers' policies.

### API checks after an authorized deployment

1. `GET /api/health`: process liveness, no database query.
2. `GET /api/health/ready`: read-only `SELECT 1`, returns 503 if unavailable.
3. Read the public catalog and categories to verify actual table compatibility.
4. Check allowed frontend Origin response headers; unrelated origins must not receive
   `Access-Control-Allow-Origin`. Non-browser clients are still governed by API auth.
5. Verify checkout/payment/refund actions remain disabled with a 503 response before
   any database/payment-provider action. Do not test a real financial transaction.

## Frontends on Vercel

Create separate Vercel projects from the same repository as needed. Customer can be
deployed without deploying Business, Merchant or Admin, but live shopping/account
features need a reachable API.

| Application | Root Directory |
| --- | --- |
| Customer | `apps/customer` |
| Merchant | `apps/merchant` |
| Admin | `apps/admin` |
| Business | `apps/business` |

For each:

- Framework Preset: **Next.js**.
- Enable **Include source files outside of the Root Directory in the Build Step**.
  Business additionally imports the existing Merchant and Admin source.
- Install Command: `pnpm --dir ../.. install --frozen-lockfile --prod=false`.
- Build Command: `node ../../scripts/validate-web-env.cjs && pnpm build`.
- Leave Output Directory at the Next.js default (do not override).
- Node.js: 22; production branch: `main`.
- The application-level `vercel.json` files encode the install/build settings.
- Customer retains `output: "export"`; its legal routes, footer and category assets
  remain in the static export. Do not use `next start` to serve this export.

Frontend environment names:

| Name | Requirement |
| --- | --- |
| `NEXT_PUBLIC_BAMORA_API_URL` | Public HTTPS Render API base URL, set before building each frontend. It is a public URL, not a secret. |
| `NEXT_PUBLIC_PAYMENTS_ENABLED` | `0` for Customer; payment controls stay disabled while under review. |
| `NEXT_PUBLIC_BAMORA_DATA_SOURCE` | Optional `api`; current main repositories explicitly select API. |
| `NEXT_PUBLIC_ENABLE_DEMO_MODE` | Leave unset or `0` for Merchant/Admin and Business imports. |

Never set passwords, secrets, API keys or tokens in `NEXT_PUBLIC_*`. The deployment
validator rejects public credential variables and demo authentication. API URL access
now uses literal `process.env.NEXT_PUBLIC_BAMORA_API_URL`, allowing Next.js to inline
the configured value rather than targeting the frontend hostname on port 4001.
Changing this URL requires a new frontend build.

Business's existing local delivery workflow includes client-side employee credentials.
That legacy workflow is blocked in production and preserved for local use. The
public admin/bootstrap password constants are compiled out of production builds;
the deployment validator also rejects credential variables. Merchant/Admin API
sign-in remains available with credentials entered interactively. Public delivery
operation needs a separately approved server-authentication and least-privilege
design; do not give delivery staff shared administrator credentials.

Production merchant login never creates or auto-activates a merchant. Existing
merchants must already be approved. The development-only admin bootstrap requires
explicit server-side `DEV_ADMIN_USERNAME` and `DEV_ADMIN_PASSWORD`; no built-in
administrator password remains. Do not set these on production services.

Protected API routes verify the signed token against the current database account
role, status and required profile on every request. A stale token cannot preserve
administrator/merchant permissions after the database role changes. Browser role
flags and headers do not grant server permissions. The existing phone-derived
merchant credential still requires a separately approved stronger authentication
factor before public merchant sign-in can be considered safe.

## Payment-provider review and public link

Production API payments default off. Keep both deployment flags disabled. The API
blocks checkout, payment creation/status updates, BAMORA fee confirmation, refunds and
payment webhook handling before financial work. Development behavior is preserved
unless explicitly disabled. Existing payment providers are scaffolds: approval alone
does not make them production-ready, and this task does not implement or activate a
financial integration.

Vercel provides an HTTPS `vercel.app` URL without buying a domain. You can reserve
the Vercel project first, enter its exact production origin in Render CORS, deploy
the API, then set its URL in Vercel and deploy Customer. Allow Preview origins only
by explicit listing, never `*.vercel.app`.

Before sending the link to Cal, the business owner must approve real contact/company
details and final legal/shipping/returns policies. Current legal text contains drafts
and contact details need verification. The contact form now prepares a mail-app draft,
not an API submission; it never claims the business received a message. Confirm the
real contact email works. Do not claim Cal approval or a working payment
integration. Confirm that legal links are accessible, Hebrew text renders, categories
load, images survive redeployment, and no disabled checkout claims a successful order.

## Local verification (no live database/payment operations)

```sh
pnpm --filter @bamora/api test
pnpm --filter @bamora/platform test
node --test scripts/*.test.cjs
pnpm typecheck
pnpm build
```

Tests use mocks for database/provider boundaries. Builds generate local output; they
do not start the API, run migrations, seed data or submit payments. Existing native
Android/Capacitor source is unchanged and is not validated by these web/API builds.

### Verification performed during preparation

A separate fresh workspace copy was installed with `--frozen-lockfile --prod=false`,
without environment files or existing node_modules. Prisma generation, native bcrypt
hash/compare, API build/tests and all four Next.js builds passed. The package store was
reused, but node_modules links and permitted lifecycle builds were created afresh.
This verification ran on Windows with the installed Node.js 24 runtime; the configured
Render/Vercel Node.js 22 Linux deployment still needs a real platform build after
authorization. The install reported an ignored optional sharp build script; the
frontend builds nevertheless passed. Prisma 6 reports deprecated seed metadata;
no seed was executed, and upgrading to Prisma 7 is outside this deployment change.
