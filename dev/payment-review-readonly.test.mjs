// Strict read-only guards: writes/alarms/transports throw, not silent mocks.
import test from 'node:test';
import assert from 'node:assert/strict';
import {PurchaseLedger} from '../worker/src/purchase-ledger.js';
import {fixture} from './production-native-fixture.mjs';
const record=(id,patch={})=>({id,orderReference:'local-'+id,phase:'unknown',inventory:'pending',projection:'pending',quote:{total:1330},stockKeys:['yomogi-10g'],createdAt:'2026-11-06T00:00:00Z',...patch});
function storage(data){return {data:structuredClone(data),get:async k=>structuredClone(data.get(k)),list:async({prefix='',startAfter='',limit=128}={})=>new Map([...data].filter(([k])=>k.startsWith(prefix)&&k>startAfter).sort(([a],[b])=>a.localeCompare(b)).slice(0,limit).map(([k,v])=>[k,structuredClone(v)])),put:async()=>{throw Error('Unexpected write');},delete:async()=>{throw Error('Unexpected delete');},getAlarm:async()=>{throw Error('Unexpected Alarm read');},setAlarm:async()=>{throw Error('Unexpected Alarm reservation');}};}
test('cold warning review includes unindexed legacy records and leaves indexes/Outbox/holds untouched',async()=>{
 const data=new Map([['attempt:unknown',record('unknown')],['attempt:paid',record('paid',{phase:'paid',inventory:'applied',projection:'stored'})],['attempt:declined',record('declined',{phase:'declined'})],['attempt:manual',record('manual',{manual:true})],['sku-holds',{'yomogi-10g':['unknown','manual']}]]),before=structuredClone(data);
 const s=storage(data),ledger=new PurchaseLedger(s,{mail:{prepare:()=>{throw Error('Unexpected mail preparation');},send:()=>{throw Error('Unexpected mail send');}}});
 for(let n=0;n<2;n++){const list=await ledger.warnings();assert.deepEqual(list.map(r=>r.attemptId).sort(),['manual','unknown']);assert(list.every(r=>r.retryAllowed===false));assert.deepEqual(data,before);assert.equal(ledger.initialized,undefined);}
});
test('read-only review paginates the journal without generating missing pending indexes',async()=>{
 const data=new Map(Array.from({length:130},(_,i)=>{const id=String(i).padStart(3,'0');return ['attempt:'+id,record(id)];}));const ledger=new PurchaseLedger(storage(data),{});const before=structuredClone(data);assert.equal((await ledger.warnings()).length,130);assert.deepEqual(data,before);
});
test('authenticated Production administrator GET is pure on a cold coordinator with Checkout OFF',async t=>{
 const f=await fixture(t,{env:{PRODUCTION_CHECKOUT_ENABLED:'0',PRODUCTION_MANAGED_CHECKOUT_ENABLED:'0',PRODUCTION_MANAGEMENT_CATALOG_ENABLED:'0',PRODUCTION_UNIFIED_PUBLISH_ENABLED:'0'}});
 const id=crypto.randomUUID(),r=record(id);f.storage.data.set('attempt:'+id,r);f.storage.data.set('sku-holds',{'yomogi-10g':[id]});const before=structuredClone(f.storage.data),alarm=f.storage.alarm,orders=f.native.prepare('SELECT COUNT(*) n FROM orders').get().n;
 for(const name of ['put','delete','setAlarm','deleteAlarm'])f.storage[name]=async()=>{throw Error('GET cannot mutate DO state');};
 for(let n=0;n<2;n++){const response=await f.call('/api/admin/payment-attempts?include_failed=1&include_diagnostics=1');assert.equal(response.status,200);const d=await response.json();assert(Array.isArray(d.diagnostics));assert(Array.isArray(d.failures));assert.equal(d.attempts.length,1);assert.equal(d.attempts[0].attemptId,id);assert.deepEqual(f.storage.data,before);assert.equal(f.storage.alarm,alarm);}
 assert.equal(f.native.prepare('SELECT COUNT(*) n FROM orders').get().n,orders);assert.equal(f.fake.payments.size,0);assert.equal(f.squareCalls.length,0);assert.equal(f.mails.length,0);
});
test('order and mail-status GET run SELECT only and do not initialize a cold Outbox',async t=>{
 const f=await fixture(t,{env:{PRODUCTION_CHECKOUT_ENABLED:'0',PRODUCTION_MANAGED_CHECKOUT_ENABLED:'0',PRODUCTION_MANAGEMENT_CATALOG_ENABLED:'0',PRODUCTION_UNIFIED_PUBLISH_ENABLED:'0'}});
 const before=structuredClone(f.storage.data),alarm=f.storage.alarm,prepare=f.db.prepare.bind(f.db);
 f.db.prepare=sql=>{assert.match(sql,/^\s*SELECT\b/i,'read endpoint must not run DDL or DML');return prepare(sql);};
 for(const name of ['put','delete','setAlarm','deleteAlarm'])f.storage[name]=async()=>{throw Error('GET cannot mutate Outbox');};
 for(const path of ['/api/admin/orders?status=shipped','/api/admin/orders/old-1','/api/admin/orders/old-1/mail-status']){const r=await f.call(path);assert.equal(r.status,200);await r.json();}
 assert.deepEqual(f.storage.data,before);assert.equal(f.storage.alarm,alarm);assert.equal(f.squareCalls.length,0);assert.equal(f.mails.length,0);
});
