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

Before publication record the full **admin** active Version, separate from the
payment OFF Version. Afterward verify Access still blocks unauthenticated access,
log in normally and use the existing “未解決決済を確認” button to expand the trace.
If the API omits diagnostics, the section must say 未確認 rather than vanish.
Rollback uses that recorded admin Version with Wrangler's `rollback VERSION
--name yasoya-honten-admin --config VERIFIED_ADMIN_CONFIG --yes`, after approval.
Neither admin rollback nor this asset patch restores/changes D1, DO or Square data.
