# Existing admin payment-trace UI backport

This patch restores an existing feature; it changes only `admin/index.html` and
`js/admin.js` (trace section, existing authenticated GET's diagnostics flag,
rendering/error state). It excludes the unrelated photo-copy change found between
reference f766911 and the release HTML. f766911 is a test/reference baseline,
**not evidence of the currently deployed admin version**.

The current admin Version/100% traffic, deployed asset provenance and actual
admin deployment config remain required before publication. Codex metadata GET
returned HTTP 400/9106; no live Version or cache/content comparison is claimed.
The released payments source already has the diagnostics GET; do not redeploy it.

After approval, copy the **current admin ASSETS** into a new private staging
folder, leaving originals untouched. In a separate temporary Git work directory,
place that copy at `site/`, then run `git apply --check --directory=site` and
`git apply --directory=site` with `production/admin-payment-trace-ui.patch`.
An apply failure stops; do not replace all files with historical/release UI.
Verify only the two patched files differ; CSS, admin-management.js and admin-ui.js
must remain byte-identical. Never run prepare-admin.mjs over the live asset copy.

Use the verified existing admin entrypoint/config, unchanged Access JWT rules,
origin, services and routes. Pin Wrangler 4.155.0; dry-run the admin-only change,
then (only after approval) deploy **yasoya-honten-admin**, using the patched ASSETS.
Do not use admin.example.jsonc as a snapshot of live settings. Do not deploy the
payments Worker, modify main, enable checkout, run SQL or change any Secret.

Admin rollback identity was confirmed by the user in Cloudflare Dashboard on
2026-11-09 (JST): **027b2201-4955-4856-9e9d-b380bcfff23e**; displayed age: “4d ago”.
The exact upload timestamp and deployed asset hashes are still unverified; do not
convert this rounded age into an exact timestamp. Recheck this same admin Version
and 100% traffic immediately before any approved update. A mismatch stops.

A normal browser navigation to the diagnostics API is not an alternative to the
UI: both Cloudflare Access JWT validation and Authorization Bearer ADMIN_TOKEN
are required. The existing admin data() function supplies these credentials;
normal address-bar navigation does not reuse its Authorization header. Do not
put credentials in query strings or remove either authentication gate.

Before publication retain this full **admin** Version, separate from the
payment OFF Version. Afterward verify Access still blocks unauthenticated access,
log in normally and use the existing “未解決決済を確認” button to expand the trace.
If the API omits diagnostics, the section must say 未確認 rather than vanish.
Rollback uses that recorded admin Version (027b2201-4955-4856-9e9d-b380bcfff23e) with Wrangler's `rollback VERSION
--name yasoya-honten-admin --config VERIFIED_ADMIN_CONFIG --yes`, after approval.
Neither admin rollback nor this asset patch restores/changes D1, DO or Square data.
