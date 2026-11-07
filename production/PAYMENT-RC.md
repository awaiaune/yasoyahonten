# Production payment release candidate — 2026-11-06

Status: Draft PR #4 candidate; no Production deployment, remote data updates or purchase enablement.

## Scope and evidence

- Remote baseline / common ancestor: `476fd537ea4789d8e0fd200bae832c9fc02868f4`.
- Reviewed source: `1b50bcf53c31d1f9ce3e21889e804d397776b445`; its 80-file delta was not merged.
- Shared payment dependencies come from `e441974e9c7fadd69ffe3118e6b7fdfd5678220b`, with only the generic post-dispatch HTTP-error handling from the latest source. Staging recipient/product admission changes were excluded.
- The user confirmed Android Staging JCB 3DS, Sandbox COMPLETED, THANK YOU, D1 order and `inventory_adjusted=1` for order `YH-20261106-BECA1143`, JPY 1,330. This is user-supplied Sandbox evidence, not Production verification.

Included dependency groups:

1. Direct trusted PAY NOW → SDK tokenization, read-only status/capability/quote rechecks after authentication, safe uncertain-attempt persistence and disabled busy status control.
2. Production-only Square CSP form target `https://api.squareup.com`, PCI/frame/connect/font vendor origins, no broad issuer/script permission or bypass.
3. Safe payment-error evidence, strict matched payment identity before terminal failure, bounded seven-day diagnostics and Access-protected administrator display.
4. Existing PurchaseCoordinator serialization, per-attempt payment/inventory idempotency and recovery; additive DO mail Outbox with independent recipients and fixed messages/keys. Validation's existing mail-service boundary follows the new interface.
5. Managed published-product verification when unified publication is OFF, no legacy fixed-catalog resurrection, no Catalog write grant. Production product buttons also require both purchase flags.
6. Neutral receipt page until the original tab's attempt matches the server payment/order result. The supplied live V56 checkout/receipt layout is retained; its original IDs work with the reviewed payment JS. The separately deployed admin Worker is not redeployed.

Excluded: new Staging recipient guard/endpoint, Staging purchasing switch changes, admin UI redesign, new infrastructure settings, credentials and all migrations. Existing resource files, original image bytes and migration settings are protected by `payment-rc-manifest.json`. The established V57 optional representative-image field is preserved in product validation/rendering; this prevents reverting already-public image selection. It does not add an editor or change gallery order.

## Safety and unresolved deployment prerequisites

- No D1 schema/SQL migration, namespace migration, resource recreation or order/hold cleanup is part of this candidate.
- The existing Worker/class/fixed Object identity remains unchanged. Mail/diagnostic state uses additional storage keys. Legacy sent-mail uncertainty remains manual review; it is not blindly resent.
- Status/THANK YOU/Alarm can resume the original paid order's pending inventory/order/mail work even with new purchases OFF. They do not create another charge. Existing unresolved attempts must not be deleted or forcibly released.
- The supplied `yasoya-live.zip` was compared against generated assets, not just root source. Its transaction HTML exactly matches the existing verified V57 templates; checkout CSS/menu/cart scripts already match the candidate package. Homepage differences include dynamic D1 content, which must not be baked into HTML. The uploaded payment JS is older and must not replace the candidate's direct-activation and recovery fixes.
- The ZIP does not include all live images, product templates, admin assets or referenced CSS. The mandatory actual-release assembly below copies the operational ASSETS directory byte-for-byte and replaces only `js/checkout-v1.js`. Do not deploy the default reconstructed asset directory as a substitute for that copy. Original assets and the real OFF profile are never overwritten. Unrecognized/incomplete source assets stop assembly.
- No real OFF profile is available here. The new version-based preparer does not require one; the real Codespaces Version JSON and operational assets remain necessary evidence for a real-profile dry-run.
- **Do not deploy the tracked `production/release/ready.jsonc`.** It is a historical example with Catalog enabled and is not the current operational profile. It is preserved only to avoid silently rewriting baseline settings.

## Current gated step: reconstruct OFF from live Version metadata

An old local OFF config is **not required**. The earlier Codespaces instruction
that required `ready-inventory.local.jsonc` is superseded. Do not create it from
historical `ready.jsonc` and do not treat either historical file as live truth.

Use `production/prepare-off-from-version.mjs` with the existing
`/tmp/yasoya-live-version.json`. It reads the official `versions view --json`
shape (`id`, `resources.bindings`, `resources.script_runtime`) and verifies the
four live OFF/Catalog/inventory flags. Plaintext vars are retained exactly;
Secret bindings contribute names only. Inline credential values, Sandbox
bindings, unknown binding types and resource mismatches stop preparation.

`--collect` calls the official pinned Wrangler `auth token --json` in a child
process with stdout captured only in memory; its JSON output is never forwarded
or saved. API-token and existing OAuth sessions are supported. Global API-key
auth is refused. The script makes GET requests only, to the fixed confirmed
account: deployment (sole Version at 100%), same Version content, settings,
routes, custom domains, workers.dev/preview flags, schedules, D1 metadata and
the exact existing DO namespace. Worker identity/version inconsistencies stop immediately. Independent metadata GETs settle separately, recording only safe status/codes/endpoints; no endpoint is retried. It never calls D1 query or DO objects. The narrowly scoped D1 authorization alternative below is explicitly recorded, not treated as D1 API success.
Required minimum read permissions for these reads are Workers Scripts Read,
Workers Routes Read for route/domain access, and D1 Read. No edit permission is
needed for preparation. Retain the existing authenticated Codespaces session;
do not publish its token or call `auth token` directly in the terminal.

The resulting private local OFF profile retains compatibility, vars, service
bindings, routes, ASSETS options, schedules and existing storage resources.
`keep_vars=true` preserves remote Secrets; no Secret value is requested. The
profile intentionally has **no DO migration steps** (`migrations: []`), so it
does not invent/replay namespace creation or migration history. Namespace ID,
class, bound Worker and SQLite storage must match the actual namespace GET.
The operational ASSETS directory is copied intact; only the reviewed payment JS
is changed. The separate admin Worker is not redeployed.

## Local verification result

633 distinct tests passed: regression 371, browser 75, additional 187; zero failures/cancellations/skips in final suites. Purchase/API/admin Worker bundles and packaged root-asset equality passed. Early integration failures were resolved by bringing the Outbox interface tests/guard together, adding the missing Production OFF button guard, adapting browser interaction to the retained notice/select controls, and retaining noindex on transaction pages. A parallel regression runner timed out at shutdown; the bounded serial final run passed all 371 tests. Local logs remain ignored in `dev/.state/payment-rc/`. Production OFF-profile validation stopped with `EXISTING_OFF_PROFILE_NOT_FOUND`; no guessed profile or Wrangler deployment was made.


## Version-based Codespaces procedure — no deploy

From a clean candidate checkout after fetching the updated PR branch:

```bash
node production/prepare-off-from-version.mjs /tmp/yasoya-live-version.json --collect --dry-run
```

This command deliberately does not infer a local asset path. If required
information is missing, it prints **all missing fields together** and their
acquisition methods, without writing a partial/guessed OFF config. Successful
metadata reads are cached privately under `/tmp/yasoya-off-evidence-*/`; rerun
with `--evidence <that-file>` rather than repeating `--collect`.

There are two asset facts that `versions view` may not restore:

- **Local operational ASSETS directory and file bytes:** Version JSON contains
  neither the upload's local filesystem path nor all static images/pages. Locate
  the directory that was used for the current release, for example with
  `find /workspaces -type d -path '*/production/.generated/v53' -not -path '*/node_modules/*'`.
  Select the actual operational directory, not a newly rebuilt candidate. Supply
  `--assets /absolute/path/to/that/directory`. Known live HTML/cart hashes and
  dependencies must match; unknown/incomplete assets stop. The uploaded 20-file
  ZIP is insufficient as a complete ASSETS directory.
- **Asset routing if omitted by the API:** the collector checks the current
  script settings GET. If it omits routing, check Cloudflare Dashboard → Workers & Pages → `yasoya-honten-payments` → Settings → Assets, and record the CURRENT asset
  settings in a private JSON file with `worker`, `versionId`, and `config` keys.
  `config` must contain the confirmed `run_worker_first` plus any explicitly
  configured `html_handling`, `not_found_handling`, `base_path`. Use
  `--asset-settings /path/to/file.json`. Do not copy a tracked example or invent
  omitted values. Unknown options/conflicting API evidence stop preparation.

A continuation reuses the same cached metadata, for example:
`node production/prepare-off-from-version.mjs /tmp/yasoya-live-version.json --evidence /tmp/yasoya-off-evidence-.../evidence.json --assets /actual/operational/assets --dry-run`.
`--asset-settings` is needed only when the current API omits asset routing.
No current local profile is overwritten. New config/evidence/log files use
0600 permissions inside a private 0700 temporary directory, never Git paths.

Only after all evidence is present does the script run pinned Wrangler
`deploy --dry-run` against the newly assembled OFF profile. It never runs
`deploy` without `--dry-run`. The output directory contains `release/off.local.jsonc`,
`evidence.json` (rollback Version and Secret names only) and a safe `dry-run/diagnostic.json`. Raw child-process output is not saved.
A real deploy/purchase-ON still requires separate approval and a fresh check
that the active Version has not changed since evidence collection. Rollback
would target the captured Version with purchasing OFF, without restoring or
deleting D1/DO/R2/Outbox/attempt data; admin Worker remains unchanged.

Latest preparation tests: 41 targeted tests passed, failures 0, including three
Worker builds and a mocked dry-run command boundary. Real Codespaces Version
JSON, current operational assets and Cloudflare credential are not mounted in
Codex; actual metadata collection and real-profile dry-run remain unverified.
No Production request, deployment or data change was performed by this work.


## D1 metadata authorization denial — confirmed identity alternative

The observed Codespaces result is HTTP 401 / Cloudflare code 10000 only on
`GET /accounts/{account}/d1/database/{database-id}`, after Worker version reads
succeeded. The path matches Cloudflare's D1 database GET API; all metadata reads
use the same Bearer credential. This supports an endpoint/resource permission
or account-scope issue, but **does not prove** which permission is missing.
OAuth and API tokens are both supported by Wrangler/D1; the status/code alone
does not establish an unsupported auth method or a bad token. If direct D1
metadata access is wanted later, the minimum additional API-token permission
is Account → D1 → Read on this confirmed account. It is not a prerequisite for
this identity-only OFF dry-run when the following proof is complete.

`confirmed-production-resources.json` records the user's 2026-11-07 Cloudflare
Dashboard confirmation of `yasoya-orders` / `442fa9fd-25d3-4c01-bcc3-04be7b420cf5`,
with account, Worker, binding and source. Only HTTP 401/403 plus code 10000 on
that exact D1 endpoint qualifies. The saved and freshly fetched live Version
bindings must both identify `ORDERS_DB`, type `d1`, and exactly that UUID.
Unattributed, altered or mismatching confirmations are refused. A successful
API response with conflicting name/UUID, 404/5xx/network error, or a different
auth error code is never replaced with the confirmation.

The collector continues all independent route/domain/subdomain/schedule/DO
reads, records their failures, and blocks preparation if any other required
proof is missing. Missing fields and safe endpoint/status diagnostics are
shown together and retained in the private cache. Fallback provenance and the
D1 API denial are included in the final private `evidence.json`, explicitly
`apiReadVerified: false`. This proves target identity only, not D1 read/write
permission, schema, contents, backups or application-runtime health.

For the next Codespaces dry-run, the user supplied asset candidate is
`/workspaces/yasoya-v60-csp/production/.generated/v53`. The reported 19-file ZIP
match is user-supplied evidence about those files only; it does **not** prove
whole-directory identity to the live uploaded asset bundle. No design/image
or product template is rebuilt. Existing input assets are copied intact and
only the reviewed payment JS is replaced. This scope is recorded in the
release receipt; dry-run success does not authorize deploy or establish full
live asset equivalence.

Latest targeted verification: 45 tests passed (the 27 existing preparation
cases, 12 D1-identity/independent-read cases, 6 release-boundary/build cases).
Three Worker bundles passed. The new end-to-end preparation test uses real
local files and synthetic Cloudflare metadata; the Wrangler invocation is a
substitute. The actual Codespaces Version JSON and asset candidate are not
mounted in Codex, so a real Production-profile Wrangler dry-run is unverified.


## Exit-code 1 diagnosis / resume

The historical Codespaces failure stage is unknown. Confirmed code defects:
failed Wrangler stdout/stderr were discarded, file errors lost their phase,
and assembly failure removed its newly generated evidence/config directory.
These have been corrected without changing checkout, resources or D1 fallback.

`prepare-off-from-version.mjs` now attaches explicit phases: Version read,
validation, auth, metadata, asset settings/path, OFF validation, output creation,
asset assembly and Wrangler dry-run. Failures retain private generated state
and a safe `failure.json`. No raw child output or arbitrary error text is
printed/saved; only whitelisted codes, numeric HTTP/exit status, OS errno and
fixed compiler signature categories are retained. Success logs are also safe
status records. A command returning exit 1 always remains a failure.

From the existing Codespaces repository, run this **one diagnostic command**:

```bash
bash -o pipefail -c 'git fetch origin release/production-payment-rc-20261106 >/dev/null 2>&1 || { echo "STOP stage=git_fetch code=GIT_FETCH_FAILED"; exit 1; }; git show FETCH_HEAD:production/diagnose-off-release.mjs | node --input-type=module'
```

The standalone launcher reuses a clean worktree at the fetched SHA, creating
one detached worktree only if needed; no existing branch/worktree is reset or
overwritten. It first looks for a previous prepared OFF profile. Resume requires
its captured Version/vars to match `/tmp/yasoya-live-version.json`, a clean
tracked source tree and unchanged runtime code versus the fetched candidate.
An unverified/different source stops. The original config/assets are not changed;
Wrangler writes only to a new private dry-run output directory. If no prepared
profile exists, matching cached metadata is reused. Only if neither is available
is read-only collection performed once, using the existing known asset candidate.
The D1 401/403 + 10000 identity alternative and all OFF/resource guards remain.

The terminal gets only a safe final phase/code summary; journals are private
`/tmp/yasoya-off-diagnostic-*/events.json` (0600 under a 0700 directory). This
runs in a child shell instead of applying `set -e` to the user's terminal.
It never runs a real deploy, purchase API, SQL, resource reset or Secret update.
Missing settings/asset mismatch are still STOP, not warnings or bypasses.

Local result: 61 related tests passed (16 diagnostic/resume cases, 39 preparation
cases including existing pagination and D1-denial proofs, 6 boundary/build cases).
Three Worker bundles passed. An additional real pinned Wrangler 4.155.0 dry-run
passed with a **synthetic OFF profile**, local candidate assets and no credentials.
The isolated Codex test required a writable npm/config cache; that environmental
finding is not attributed to Codespaces and the user's auth paths are unchanged.
A real Codespaces Production-profile dry-run is not claimed until its diagnostic
command actually returns SUCCESS.
