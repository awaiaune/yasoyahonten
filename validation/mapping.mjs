// Offline binding validation; no Square/Cloudflare requests.
import { createHash } from 'node:crypto';
import { settingsCheck } from './seed-square.mjs';
import { assertManifest } from './safety.js';
export function assertSavedMapping(m, mapping, settings, plan) {
    assertManifest(m);settingsCheck(settings);
    const need=(ok)=>{if(!ok)throw new Error('Saved Sandbox mapping differs from manifest, settings or product source');};
    const keys=['schema','applicationId','locationId','sourceDigest','variations','items'];
    need(mapping && Object.keys(mapping).sort().join()===keys.sort().join() && mapping.schema===1);
    need(mapping.applicationId===settings.applicationId && mapping.applicationId===m.squareApplicationId);
    need(mapping.locationId===settings.locationId && mapping.locationId===m.squareLocationId);
    need(mapping.sourceDigest===createHash('sha256').update(JSON.stringify(plan)).digest('hex'));
    const ids=plan.groups.flatMap(g=>g.variations.map(v=>v.id)).sort();
    need(mapping.variations && Object.keys(mapping.variations).sort().join()===ids.join());
    need(ids.every(id=>mapping.variations[id]===m.variations[id]));
    need(mapping.items && Object.keys(mapping.items).sort().join()===plan.groups.map(g=>g.key).sort().join());
    need(new Set(Object.values(mapping.items)).size===3 && Object.values(mapping.items).every(id=>/^[A-Z0-9]{8,64}$/.test(id)));
}
