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
  `apps/api/prisma/schema.prisma`. Readiness checks every Prisma model table and
  scalar column with zero-row SELECTs, without reading customer records. It rejects
  missing tables/columns or missing read permissions. It does not certify column
  types, constraints, business data, or that this is the intended Supabase project.
- Production no longer performs the legacy automatic `ALTER TABLE` operations for
  order snapshots/suborder attention columns. Missing columns cause an explicit
  service-unavailable response. Do not work around this by running `db:push`,
  `db:migrate`, `db:seed`, or an ad-hoc schema update.
- The pnpm lifecycle-build allowlist is in `pnpm-workspace.yaml` and covers Prisma
  and bcrypt. It does not blanket-enable arbitrary dependency installation scripts.
  Keep dev dependencies available during builds so Prisma CLI and TypeScript exist.

### Initial database migration (separate approval required)

`apps/api/prisma/migrations/20261011000000_initial/migration.sql` is generated from
the initial schema, including enums, tables, indexes and foreign keys.
The second migration, `20261013120000_guest_checkout_consent`, makes the order
customer optional, changes the marketing default, and adds a consent timestamp.
Deploy both SQL files together with the current `schema.prisma` and PostgreSQL
`migration_lock.toml`; do not rewrite the initial migration.
It creates structure only: no accounts, products, categories, shipping configuration
or other seed data. A fresh database will not contain the existing catalog.

- `pnpm --filter @bamora/api db:validate` validates the schema offline.
- `pnpm --filter @bamora/api db:migration:check` applies the complete SQL history
  to disposable in-memory PostgreSQL and compares columns, types, defaults,
  constraints, indexes and enums with a fresh offline Prisma schema diff.
- `pnpm --filter @bamora/api build` generates Prisma Client before compiling.
  The API `typecheck` script also generates the client before checking types.
  Generation and validation use a temporary schema copy and a non-secret dummy URL;
  they do not read project `.env` files or connect to a database.
- The tests apply the SQL to disposable in-memory PostgreSQL using PGlite, never
  to `DATABASE_URL`. They verify tables, columns, enum values, indexes, foreign keys
  and readiness failures.

For a genuinely empty, separately authorized database, the explicit deployment
command is `pnpm --filter @bamora/api db:migrate:deploy`. **This writes schema and
migration history and must not be run without approval.** It is deliberately absent
from Render's build command. Startup runs it only through the explicit initial
provisioning activation documented below. Do not use `migrate dev`, `db push` or
seed as deployment shortcuts.

For the existing Supabase database with project tables, **do not apply this initial
migration blindly**. First obtain an authorized backup and a read-only schema
comparison. If it already matches, a separately approved Prisma baseline is needed;
if it differs, plan and approve a non-destructive reconciliation before baselining.
No database has been baselined, migrated, seeded or externally verified by this work.

## API on Render

Use a Node **Web Service** from `balsam77/BAMORA`, branch `main`. Leave Root Directory
empty (repository root). `render.yaml` is an optional Blueprint with the same settings.
The Blueprint uses Render Free with local uploads disabled and no persistent disk.
Automatic deployments are disabled in the Blueprint.

| Setting | Value |
| --- | --- |
| Node | 22 |
| Build Command | `corepack enable && pnpm install --frozen-lockfile --prod=false && pnpm --filter @bamora/api build` |
| Start Command | `pnpm --filter @bamora/api start` |
| Health Check Path | `/api/health/ready` |
| Upload storage | Disabled on Free; no disk required |

Set these in Render's environment/secret controls, never in committed files:

| Name | Requirement |
| --- | --- |
| `NODE_ENV` | `production` |
| `DATABASE_URL` | The existing authorized PostgreSQL connection; do not replace the local configuration or change the database. |
| `DATABASE_SSL_CA_FILE` | Optional absolute path to the database provider's official PEM CA certificate. On Render: `/etc/secrets/prod-ca-2021.crt`. |
| `JWT_SECRET` | Random, strong secret, at least 32 characters; not a development default. |
| `CORS_ORIGINS` | Comma-separated exact HTTPS origins for deployed Customer, Merchant, Admin and Business as applicable. No paths, trailing slash or wildcard. |
| `UPLOAD_STORAGE` | `disabled` on Free. Production defaults to disabled when unset. `local` requires a separately approved persistent disk. |
| `UPLOAD_DIR` | Only needed with `UPLOAD_STORAGE=local`: absolute path matching the persistent disk mount. Not used when disabled; never point it at `/tmp` to enable production uploads. |
| `PAYMENTS_ENABLED` | `false` until payment-provider approval and a separately approved activation. |
| `PORT` | Supplied by Render; the API binds to `0.0.0.0`. |
| `MERCHANT_SUBORDER_DELAY_HOURS` | Optional; retain the existing business value if configured. |

Do not change `PAYMENT_PROVIDER` or provider credentials in this deployment task.
`db:generate` only generates Prisma Client; it is not a database migration.
Render terminates HTTPS and forwards traffic to the application's assigned port.

### Supabase database certificate trust

For a Prisma `P1011` certificate-chain failure, obtain the official CA from the
Supabase project's SSL configuration. Add its complete PEM content as a Render
Secret File named `prod-ca-2021.crt` and set
`DATABASE_SSL_CA_FILE=/etc/secrets/prod-ca-2021.crt` with `NODE_ENV=production`.
The `.crt` extension is supported; the content must be PEM. Do not commit the
certificate or a private key. Do not change `DATABASE_URL` or its password.

The API validates that the file contains currently valid CA certificates and no
private key, then passes its absolute path to native Prisma via `sslcert` in the
runtime datasource URL. It retains `sslmode=require` and `sslaccept=strict`.
It rejects unreadable, invalid or conflicting certificate settings.
Never disable TLS verification. `NODE_EXTRA_CA_CERTS` alone is not a substitute
for configuring native Prisma's certificate trust.

Deploy a commit containing this support; older commits ignore the custom variable.
Certificate metadata validation does not prove its source or that it matches the
pooler's chain. Confirm actual TLS connectivity with startup logs and
`/api/health/ready` after deployment. No migration or seed is needed for this fix.

### Explicit initial production migration

`pnpm --filter @bamora/api db:migrate:deploy` now runs a guarded CLI wrapper.
Build the API first. Set `BAMORA_EXPECTED_DATABASE_PROJECT` to the confirmed
reference `nmhccvyjttluanarixvu` and `DATABASE_SSL_CA_FILE` to its verified PEM CA.
The wrapper uses the same strict runtime TLS configuration in memory for both
the native Prisma preflight and the Prisma migration CLI. Stored `DATABASE_URL`
and environment files are never changed, and CLI output containing connection
metadata is withheld.

Use `pnpm --filter @bamora/api db:migrate:deploy --check` to perform only the
read-only connection, public-schema emptiness and schema-privilege preflight.
Only the execution process environment supplies `DATABASE_URL`; no local dotenv
fallback or `--env-file` argument is accepted. The project reference must match
the direct endpoint or the Session Pooler username. Database `postgres`, schema
`public`, and Prisma/client 6.19.3 are required.

This command is intentionally limited to initial provisioning: it refuses existing
non-extension tables, views, sequences or enum types in public, including a prior
migration history. It is not a routine upgrade command. Review all pending
migrations before execution. After the preflight, the explicit deploy command
calls `prisma migrate deploy` once and verifies completed migration history and
zero-row readiness reads.
It does not seed or enable payments. Failed or partial migrations require manual
investigation; never rerun blindly.

### Render Free initial provisioning (separate approval required)

Use the build command in the settings table above, including `--prod=false`,
so the Prisma CLI remains available to initialization, and use
`pnpm --filter @bamora/api start` as the Start Command. No Shell or Pre-deploy
Command is required. Set the Health Check Path to `/api/health/ready`.
The existing service can differ from `render.yaml`; editing the Blueprint alone
does not update a manually configured service. Disable actual Auto-Deploy before
publishing or changing activation settings, then trigger only one approved deploy.
After explicit production-write approval, set in Render:

- `NODE_ENV=production`
- `BAMORA_EXPECTED_DATABASE_PROJECT=nmhccvyjttluanarixvu`
- `BAMORA_INITIALIZE_DATABASE=true`
- Keep the existing `DATABASE_URL`, payments configuration, Secret File, and
  `DATABASE_SSL_CA_FILE=/etc/secrets/prod-ca-2021.crt` unchanged.

The startup wrapper awaits guarded initialization before launching the API.
Any failed preflight, migration or postcheck blocks API startup. On restarts,
the exact two completed migration names and SQL checksums, plus readable schema,
are required to skip migration. LF/CRLF differences are accepted, SQL edits are
not. Missing, partial, failed or changed history stops startup.

Run only one initializer instance and exclude concurrent deploys/schema writers:
the read-only preflight is not an atomic lock spanning the CLI invocation.
SQL is not wrapped in a whole-history transaction, so failures may leave partial
structure and require investigation rather than a blind retry.
After logs confirm completion and `/api/health/ready` returns HTTP 200, disable
`BAMORA_INITIALIZE_DATABASE` by setting it to `false`. It defaults to disabled
when absent, and invalid activation values fail explicitly.

### Persistent uploads

The public `GET /api/catalog/products` route reuses the existing published-product
search and accepts an optional string `q`. It requires no customer login and
does not enable guest checkout, seed catalog data, or change payment settings.
An initialized database without products returns an empty array.

On Render Free, production defaults to disabled local storage. Startup does not create
or access an upload directory, does not serve local `/uploads/` files, and product
cleanup does not delete local files. Authorized upload requests receive HTTP 503 with
an explicit unavailable message before multipart parsing or disk writes. Unauthorized
requests retain existing authorization errors. Existing product/account/catalog
behavior is otherwise unchanged; local-disk images will not be available on Free.
Production uploads need separately approved durable object storage or a paid disk.
Do not use an ephemeral directory as a substitute. Local development defaults to
the existing local-disk behavior.

With `UPLOAD_STORAGE=local`, startup creates the configured directory if needed and verifies write access. Upload
storage, static `/uploads/` serving and product-file cleanup share the same directory.
The mount must be a persistent disk, not merely a directory on an ephemeral filesystem.
The health endpoint cannot prove disk persistence: verify the attached disk in Render,
then upload a non-private test product image through an authorized account, redeploy
and verify its URL still works. Do not copy private existing uploads automatically.
Existing product images may need a separately authorized transfer or re-upload.

Use one API instance with this local-disk design. Multi-instance scaling requires a
separately designed shared/object storage backend. Back up the disk and database
according to their providers' policies. The Blueprint does not provision this disk.

### API checks after an authorized deployment

1. `GET /api/health`: process liveness, no database query.
2. `GET /api/health/ready`: zero-row, read-only checks of all Prisma model tables and
   scalar columns, returns 503 if connectivity/schema/read permissions are unavailable.
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

Tests use mocks for database/provider boundaries and disposable in-memory PostgreSQL
for migration/readiness verification. Builds generate local output; they do not start
the API, run migrations on a configured database, seed data or submit payments. Existing native
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
