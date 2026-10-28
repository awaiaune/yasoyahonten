# v53 private staging

Public assets under `site/` are the merged v53 ZIPs. Uploaded Worker code and notes are not used. Production root assets and `worker/wrangler.jsonc` are not replaced.

Prepare: `npm --prefix dev ci` then `node staging/prepare.mjs`.
Test: `timeout --kill-after=5s 90s node --test dev/staging-v53.test.mjs`.

Wrangler is pinned to 4.153.0 in this directory. For a later staging-only Git build, root=`staging`, build command=`node configure.mjs && node prepare.mjs`, deploy command=`npm run deploy`. Supply the seven non-secret settings named in configure.mjs as build variables; it creates the ignored local config without reading tokens. These build settings apply only to the new staging Worker, never the existing production Worker.

Dedicated resources: Worker `yasoya-v53-staging`, D1 `yasoya-v53-staging-orders`, R2 `yasoya-v53-staging-images`, DO class `StagingPurchaseCoordinator`. Never bind production resources.

Before any deploy, fill the placeholders in a **local ignored copy** `wrangler.local.jsonc`: new D1 ID, distinct instance UUID, Sandbox Application/Location, Access team/AUD, approved test/admin email. Create an Access self-hosted application for `staging.awaiaune.com/*` allowing only that administrator. No workers.dev or preview bypass. Store fresh dedicated `SQUARE_SANDBOX_ACCESS_TOKEN` and `VALIDATION_ADMIN_TOKEN` as Worker Secrets; never copy production secrets.

Apply `migrations/0001_staging.sql`, `0002_management.sql`, `0003_supervision.sql` only to the new D1, then the filled `initialize.sql.template`. No existing product/stock/order is seeded. Initial catalog is intentionally empty. The admin can create products/images, synchronize to Square Sandbox and publish dynamically.

Deploy only with explicit `--config staging/wrangler.local.jsonc`; never run the root production deploy. `VALIDATION_CHECKOUT_ENABLED=0` initially. Sandbox purchase tests may later set it to 1; customer email must be the approved staging admin/test address. Mail and cron remain off. Sandbox token, D1/DO/R2, Access and hostname setup must complete before the site can be called ready.

Production implementation reuse: v53 renderer reads the same management tables and APIs. Migrating production requires separate configuration and authorization, not production IDs in this staging config. Design refinements beyond the database-driven areas remain the original v53 assets.
