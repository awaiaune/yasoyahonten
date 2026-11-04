# V58: managed checkout ON (local verification; not deployed)

Base: `9eec8b733ac50b849769c2cb5265d387a2857306` (V57).
User-reported V57 rollback candidate: `c88ef1bf-d2af-4bad-8f35-d30eb95612e9`.
The live Version/traffic, Codespaces working tree, actual local profile and current
D1/Square records have NOT been read in this isolated environment. The rollback
candidate is a user report, not a freshly verified deployment snapshot.

## Scope and prerequisites

- Change checkout/managed checkout to `1/1`; retain Catalog writes `0`, inventory
  writes `1`, and the existing Catalog approval exactly as-is.
- Managed checkout admits only published, enabled, mapped products. Old fixed IDs
  remain available for historical order recovery; they cannot revive a draft.
- No SQL/migration, new DO namespace, R2 upload, Secret update, main merge or
  management-Worker deployment is required by this patch.
- Existing `ready-inventory.local.jsonc` is the sole configuration source. Do not
  use the tracked `ready.jsonc`: it grants Catalog writes. Never fabricate the
  missing local profile or guess a Custom Domain/binding.
- Review the Codespaces HEAD and all tracked/untracked changes before integrating
  this patch. Preserve the private configuration and the previous OFF profile.
- Before release, verify the live published revisions and production mappings for
  Lemonbalm (`RRTIT6N4QLIYPUW633WDBG36`, SKU `315102D`) and Yomogi
  (`F7X4UHYUAI7PSGURVQ4LEROY`, SKU `827330F`), JPY 980. The local test fixtures
  use the user-reported quantities 1/3; those are not fresh Production reads.
- Capture the immediately preceding active full Worker Version ID, traffic split,
  target Worker, Domain, D1/DO/R2 bindings and Secret NAMES only. Confirm the
  reported V57 candidate is still available and compatible; do not assume it is
  the current production version. Keep automatic builds/previews disabled during
  the controlled release/test window.

## Local profile preparation (no deployment)

Run only in the real release worktree after inspecting its local configuration:

```bash
node production/prepare-checkout-v58.mjs \
  production/release/ready-inventory.local.jsonc \
  production/release/ready-checkout-v58.local.jsonc
npm --prefix dev run test:checkout-on
```

The preparer reads the existing OFF input, validates Production identity,
Catalog OFF / inventory ON, existing Domain/D1/DO/R2, and writes a NEW 0600 file.
Only the two checkout flags differ. It refuses missing inputs, wrong identities,
missing routes, unsafe flags, symbolic inputs and existing outputs. It never
logs configuration values. Both `.local.jsonc` files must stay out of Git.
The V56 OFF preflight is unchanged and must be run against the retained OFF
profile, not the new ON profile. A preflight PASS does not read live settings.

## Approval gate: limited real purchase

Enabling the two flags opens the public product/checkout APIs to everyone who
can reach them. Testing at a quiet time and returning OFF quickly reduces the
window but is NOT authentication or a guarantee of one purchaser.

For a truly restricted test, first agree and separately authorize a server-side
restriction covering `/api/v1/payments`, `/api/payments` and the legacy
workers.dev host. Protecting only checkout.html, hiding a button, restricting an
email supplied by the client, or protecting only the admin domain is insufficient.
No such restriction is introduced by V58. Without it, explicit acceptance of the
short public sales window is required before a real test; otherwise STOP.

## Future release commands (separate approval required; not run here)

First deploy code/assets with the UNCHANGED existing OFF profile. Confirm the
maintenance state and save that new full OFF Version ID as the immediate rollback
target. Only then, under a second explicit approval, use the new ON profile.

```bash
node production/prepare-v53.mjs
npx wrangler@4.155.0 deploy --dry-run \
  --config production/release/ready-inventory.local.jsonc
# Stage 1: separate approval, checkout stays OFF
npx wrangler@4.155.0 deploy \
  --config production/release/ready-inventory.local.jsonc
```

Stage 2 (only after the scope/identity checks and purchase-ON approval):

```bash
node production/prepare-v53.mjs
npx wrangler@4.155.0 deploy --dry-run \
  --config production/release/ready-checkout-v58.local.jsonc
# Only after review and explicit approval:
npx wrangler@4.155.0 deploy \
  --config production/release/ready-checkout-v58.local.jsonc
```

Review the dry-run's target, bindings, routes and flags locally without publishing
its output. No `d1 execute`, migration command or management Worker deploy belongs
in this release. Use `--keep-vars`/`keep_vars` as already configured; explicitly
configured vars still override Dashboard values. Do not auto-deploy the ON file
later after testing has closed admission.

## One future Yomogi test

1. Record current stock N (expected 3, but re-read), order count and active Version.
   Confirm no pending purchase/stock job for that SKU, current published mapping,
   and approved test scope. Do not repair a mismatch by recreating Catalog objects.
2. Open the canonical site in one browser/tab; add ONE Yomogi 10g. Confirm the
   server quote is 980 + 350 = 1,330 JPY. The 3,000-yen threshold applies to the
   merchandise subtotal: 3 bags cost 2,940 + 350; 4 cost 3,920 + 0.
3. Enter the authorized tester's actual card only in the Square hosted form. Click
   pay ONCE. Do not store/copy a card token. Record the attempt/order/payment IDs.
4. Regardless of success/uncertainty, immediately return purchase admission OFF
   (below). Then verify exactly one completed payment for 1,330 JPY, one new D1
   order, one inventory debit (N-1), inventory_adjusted=1 and both order emails.
   `accepted` is Resend API acceptance, not inbox delivery. THANK YOU appears
   only after the saved tab receipt agrees with the server's completed/stored
   order. A success page alone does not prove stock/email completion.

## Immediate OFF, uncertainty and rollback

- In `yasoya-honten-payments` Dashboard Variables, set ONLY
  `PRODUCTION_CHECKOUT_ENABLED=0`. Preserve managed checkout, Catalog OFF,
  inventory ON, bindings and Secrets. Confirm checkout-capabilities reports
  checkoutEnabled=false. Do not flip other flags to release a stuck order.
- Unknown payment/timeout: keep the same browser/tab and attempt ID. Do not clear
  storage, re-tokenize, create another attempt or repeat the charge. With admission
  OFF, the existing status/recovery and Alarm may still reconcile the ORIGINAL
  payment, order projection, inventory and emails. Status is NOT a pure read.
- If the journal requires manual review, stop the test. Check the saved payment
  reference/amount/location and provider results; never force-unlock a stock hold,
  overwrite quantities, resend Catalog, issue an automatic refund or create a new
  charge merely because email or order projection failed.
- If code/assets need rollback, first set admission OFF and record pending
  attempt IDs. Use the saved preceding FULL Version ID, after checking its flags:

```bash
npx wrangler@4.155.0 rollback <VERIFIED_PREVIOUS_OFF_VERSION_ID> \
  --config production/release/ready-inventory.local.jsonc
```

Rollback is a Worker-code/config action, not a D1/DO/R2 restore and not a reversal
of an accepted Square payment. Never delete/reset the journal or restore a DB
snapshot over a paid order. Legacy/outbox tasks and accepted purchases must retain
their original IDs. General reopening and any additional real purchase require
separate approval.
