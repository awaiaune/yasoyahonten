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
- The real `production/release/ready-inventory.local.jsonc` is absent in this environment. It was not invented, copied from an example, changed or committed. Therefore real-profile Wrangler dry-run, live bindings/Secrets/routes and current rollback Version are unverified.
- **Do not deploy the tracked `production/release/ready.jsonc`.** It is a historical example with Catalog enabled and is not the current operational profile. It is preserved only to avoid silently rewriting baseline settings.

## Next gated step in the authenticated release Codespace

1. Preserve the actual release worktree and its assets before switching branches. Use a separate candidate worktree as shown below. Do not run `prepare-v53.mjs` in the operational worktree; it rebuilds the directory that may contain the current live design.
2. With the existing real OFF profile, run `node production/prepare-checkout-v58.mjs --check-off production/release/ready-inventory.local.jsonc`. It must confirm Checkout OFF, Catalog OFF, the existing inventory writer and Production identity. The checker is read-only; never invoke its ON-profile generation mode for this phase.
3. Assemble from the existing assets with `prepare-off-live-assets.mjs`, then perform Wrangler **dry-run only** with the newly isolated profile. The assembler validates both purchase flags OFF, Catalog OFF and the existing inventory writer, checks known live hashes and local page dependencies, copies all operational images/product/admin assets, keeps the dynamic store-config fail-closed stub and changes only the approved payment JS. It rejects inline credentials and build hooks. Real Secrets remain bound remotely and are never retrieved. All real deployment or purchase enablement still requires separate authorization.

If a deployed candidate must be rolled back, keep new purchasing OFF and use the captured prior Version. Preserve all D1/DO storage and idempotency IDs; never retry an uncertain payment as a new attempt. A version predating the Outbox will not process its new mail tasks: keep them pending for an Outbox-capable version rather than deleting tasks or manually sending duplicate mail.

Production 3DS/charges, real Production email delivery, current live configuration and live-version equivalence remain unverified. Local SDK/payment/Resend tests use substitutes and do not prove Production success.

## Local verification result

633 distinct tests passed: regression 371, browser 75, additional 187; zero failures/cancellations/skips in final suites. Purchase/API/admin Worker bundles and packaged root-asset equality passed. Early integration failures were resolved by bringing the Outbox interface tests/guard together, adding the missing Production OFF button guard, adapting browser interaction to the retained notice/select controls, and retaining noindex on transaction pages. A parallel regression runner timed out at shutdown; the bounded serial final run passed all 371 tests. Local logs remain ignored in `dev/.state/payment-rc/`. Production OFF-profile validation stopped with `EXISTING_OFF_PROFILE_NOT_FOUND`; no guessed profile or Wrangler deployment was made.


## Preserve-live Codespaces procedure — local assembly and dry-run only

Run this **from the existing operational release worktree** whose actual OFF
profile and asset directory were used for the current deployment. It does not
use tracked `ready.jsonc`, rebuild operational assets, deploy either Worker,
change a binding or write any Production data. Missing/unknown inputs stop it.
The separate admin Worker stays at its current version.

```bash
set -euo pipefail
real_off="$(realpath production/release/ready-inventory.local.jsonc)"
test -f "$real_off"
git fetch origin release/production-payment-rc-20261106
candidate="$(mktemp -d /tmp/yasoya-payment-rc.XXXXXX)"
git worktree add --detach "$candidate/source" FETCH_HEAD
node "$candidate/source/production/prepare-off-live-assets.mjs" "$real_off" "$candidate/off-release"
npx wrangler@4.155.0 deploy --dry-run --config "$candidate/off-release/off.local.jsonc" --outdir "$candidate/off-release/dry-run" > "$candidate/dry-run.log" 2>&1
printf 'OFF assembly and dry-run passed. Keep this private release directory: %s\n' "$candidate"
```

If assembly stops with `LIVE_ASSET_MISMATCH`, `CURRENT_PAGE_RESOURCE_MISSING`
or a missing real profile, do not force it or copy the partial ZIP over assets.
Retain the private output/error and resolve only that specific input. No actual
profile, live-image byte comparison or real-profile Wrangler dry-run was possible
in the Codex workspace: the operational Codespaces assets are not mounted here.

After reviewing the dry-run and obtaining separate deployment approval, the
payment Worker command is the same command **without `--dry-run`**, using only
that retained isolated `off.local.jsonc`. Do not run the admin deploy command.
Check public page asset hashes/layout, both checkout flags OFF, protected admin
GET and receipt neutrality before any separate purchase-ON approval.

Rollback uses the verified pre-change payment Worker Version (last supplied:
`36ab2dba-dd44-4f39-bc69-6db729bd24d5`; record the actually active version just
before a future deployment). Use the authenticated release Codespace's
`npx wrangler@4.155.0 rollback <recorded-version-id> --name yasoya-honten-payments`
only under separate rollback authorization. Do not restore/delete D1, DO, R2,
Outbox tasks or unresolved attempts. Keep purchase OFF throughout. Assets and
Worker roll back together; the unchanged admin Worker needs no rollout.

Latest preserve-live verification: **72 targeted tests passed** (40 unit/integration including three Worker bundle checks; 32 browser). Mobile 360/390px transaction geometry matches the supplied live HTML. Retired cart entries are removed and cannot be re-added. D1-driven top selection, representative-image/gallery separation, Production OFF controls, post-auth revalidation, payment/stock/order replay protection and neutral/verified receipts passed locally. SDK/payment/mail transports are substitutes; this does not claim a new real Sandbox or Production payment. Logs and screenshots stay ignored under `dev/.state/live-design/`. The real OFF profile and operational images/admin assets still require the above Codespaces assembly/dry-run.
