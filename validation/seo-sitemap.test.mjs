import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sitemap = await readFile(new URL('../sitemap.xml', import.meta.url), 'utf8');
const locs = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]);
const base = 'https://yasoyahonten.awaiaune.com';

test('static fallback advertises only known active canonical URLs', () => {
  assert.deepEqual(locs, [
    `${base}/`,
    `${base}/products`,
    `${base}/products/lemonbalm10.html`,
    `${base}/products/yomogi10.html`,
  ]);
});

test('no obsolete, retired, duplicate, or non-HTTPS sitemap entries', () => {
  assert.equal(new Set(locs).size, locs.length);
  for (const loc of locs) {
    assert.equal(new URL(loc).origin, base);
    assert.ok(!loc.endsWith('/products.html'));
    assert.ok(!/\/products\/(lemonbalm|yomogi|goldenrod)\.html$/.test(loc));
  }
});

test('sitemap syntax contains matching XML url entries', () => {
  assert.match(sitemap, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
  assert.match(sitemap, /<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/);
  assert.equal((sitemap.match(/<url>/g) ?? []).length, locs.length);
  assert.equal((sitemap.match(/<\/url>/g) ?? []).length, locs.length);
});
