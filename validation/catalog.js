// Sandbox assortment only. The production catalog remains unchanged.
import { CATALOG } from '../worker/src/catalog.js';
export const SANDBOX_CATALOG = Object.freeze(Object.fromEntries([
    'lemonbalm-10g', 'yomogi-10g', 'goldenrod-leaf-10g'
].map(id => [id, Object.freeze({ ...CATALOG[id],
    name: id === 'goldenrod-leaf-10g' ? 'セイタカアワダチソウ 葉 10g' : CATALOG[id].name
})])));
export const RETIRED_SANDBOX_ID = 'goldenrod-leaf-stem-20g';
