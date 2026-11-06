# Production payment release candidate — 2026-11-06

Status: local candidate only. No push, deploy, remote data updates or purchase enablement.

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
6. Neutral receipt page until the original tab's attempt matches the server payment/order result. The original baseline layout is retained; packaging includes the checkout/admin/receipt assets together.

Excluded: new Staging recipient guard/endpoint, Staging purchasing switch changes, representative-image editor/feature, tea images, V56 redesign, new infrastructure settings, credentials and all migrations. Existing baseline resource files, designs and images are checked against the hashes in `payment-rc-manifest.json`.

## Safety and unresolved deployment prerequisites

- No D1 schema/SQL migration, namespace migration, resource recreation or order/hold cleanup is part of this candidate.
- The existing Worker/class/fixed Object identity remains unchanged. Mail/diagnostic state uses additional storage keys. Legacy sent-mail uncertainty remains manual review; it is not blindly resent.
- Status/THANK YOU/Alarm can resume the original paid order's pending inventory/order/mail work even with new purchases OFF. They do not create another charge. Existing unresolved attempts must not be deleted or forcibly released.
- The Git baseline has not been proven identical to the currently deployed Production source/assets. Retaining the specified baseline's design is not proof that it matches the live V57 design. Compare with the actual Codespaces release worktree before any deployment, especially before replacing its full assets directory.
- The real `production/release/ready-inventory.local.jsonc` is absent in this environment. It was not invented, copied from an example, changed or committed. Therefore real-profile Wrangler dry-run, live bindings/Secrets/routes and current rollback Version are unverified.
- **Do not deploy the tracked `production/release/ready.jsonc`.** It is a historical example with Catalog enabled and is not the current operational profile. It is preserved only to avoid silently rewriting baseline settings.

## Next gated step in the authenticated release Codespace

1. After separate handoff approval, compare the candidate's limited paths with the actual release tree; retain its local config, live design/assets and every existing resource/Secret/Access binding. Do not replace the entire release tree from this older Git baseline.
2. With the existing real OFF profile, run `node production/prepare-checkout-v58.mjs --check-off production/release/ready-inventory.local.jsonc`. It must confirm Checkout OFF, Catalog OFF, the existing inventory writer and Production identity. The checker is read-only; never invoke its ON-profile generation mode for this phase.
3. Package assets, compare actual asset contents, run tests, then perform Wrangler **dry-run only** with that existing profile. Record the actual active Version and any unresolved attempts through authenticated read-only checks. All real deployment or purchase enablement still requires separate authorization.

If a deployed candidate must be rolled back, keep new purchasing OFF and use the captured prior Version. Preserve all D1/DO storage and idempotency IDs; never retry an uncertain payment as a new attempt. A version predating the Outbox will not process its new mail tasks: keep them pending for an Outbox-capable version rather than deleting tasks or manually sending duplicate mail.

Production 3DS/charges, real Production email delivery, current live configuration and live-version equivalence remain unverified. Local SDK/payment/Resend tests use substitutes and do not prove Production success.

## Local verification result

633 distinct tests passed: regression 371, browser 75, additional 187; zero failures/cancellations/skips in final suites. Purchase/API/admin Worker bundles and packaged root-asset equality passed. Early integration failures were resolved by bringing the Outbox interface tests/guard together, adding the missing Production OFF button guard, adapting browser interaction to the retained notice/select controls, and retaining noindex on transaction pages. A parallel regression runner timed out at shutdown; the bounded serial final run passed all 371 tests. Local logs remain ignored in `dev/.state/payment-rc/`. Production OFF-profile validation stopped with `EXISTING_OFF_PROFILE_NOT_FOUND`; no guessed profile or Wrangler deployment was made.
