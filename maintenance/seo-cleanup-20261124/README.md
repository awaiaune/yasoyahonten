# SEO URL cleanup — 2026-11-24

## Source of truth

The current production site is served by `yasoya-honten-payments` (Cloudflare Worker) and its existing `ASSETS` binding. The checked-in root `sitemap.xml` is a **static fallback**, not the live sitemap. Production `seoResource()` generates the live sitemap from `Store(env).publicProducts()`, keeps only `isIndexableProduct()` products, and advertises the canonical shop path.

The 2026-11-23 production verification in `maintenance/home-polish-record-20261123/README.md` confirmed HTTP 200 for `/`, `/products`, `/products/lemonbalm10.html`, and `/products/yomogi10.html`. It also confirmed that old product slugs `lemonbalm.html` and `yomogi.html` did not serve active product pages; do not replace the live Worker with the old default-branch assets.

## Changes in this branch

- Remove obsolete URLs from the fallback sitemap and list only the four verified canonical storefront URLs.
- Remove no-longer-needed static `products/yomogi.html` and `products/goldenrod.html`.
- **Keep** `index.html`: the live homepage uses this path as an internal HTML asset. Removing it could break the homepage.
- **Keep** `products/lemonbalm.html`: the production Worker uses it as its HTML detail-page template (`PRODUCT_TEMPLATE`). It is **not** an advertised product URL in the new sitemap.
- Keep purchase/cart/payment, management API, D1, inventory and images untouched.

## Verification

```sh
node --test validation/seo-sitemap.test.mjs
```

The validation checks the canonical set, rejects old/retired URLs, and confirms sitemap XML structure.

## Production limitations and next checks

This PR updates repository files only; **no Cloudflare deployment** is performed. Production's sitemap is generated dynamically, so do **not** assume merging this PR alone changes the live `/sitemap.xml`.

Before a separate deployment: verify the current Worker version (last recorded `fc454b59-4ba4-4f46-91d5-b3e91645c013` on 2026-11-23), compare live `/sitemap.xml`, verify actual canonical and HTTP statuses for all four active URLs, and make sure subsequent Work changes have not replaced that version.

For old URLs with genuine replacements, permanent 301 redirects to the corresponding new canonical URL are preferable. A product permanently discontinued with no replacement should return 404 or 410. A redundant `/index.html` may redirect to `/`, but the internal template file must remain.

Once the live sitemap is verified or updated, resubmit `https://yasoyahonten.awaiaune.com/sitemap.xml` in Search Console and request indexing for `/`. Old URLs can remain in historical Search Console reports after they leave the sitemap; the live test only confirms eligibility, not guaranteed indexing.
