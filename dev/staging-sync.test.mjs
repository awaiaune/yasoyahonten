import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectSync} from '../worker/src/management/sync-diagnostics.js';
import {Square} from '../worker/src/management/square.js';
const body={batches:[{objects:[{id:'#new-item',item_data:{variations:[{item_variation_data:{sku:'original-sku'}}]}}]}]};
const item=id=>({type:'ITEM',id,item_data:{variations:[{item_variation_data:{sku:'original-sku'}}]}});
test('creation discovery checks all pages and refuses duplicate original SKU',async()=>{
 const square=new Square({RUNTIME_TIER:'staging'}),calls=[];
 square.request=async(path,...args)=>{calls.push([path,args]);return path.includes('cursor=')?{objects:[item('SECOND')]}:{objects:[item('FIRST')],cursor:'next'};};
 await assert.rejects(square.findCreatedItem(body),{status:409});
 assert.equal(calls.length,2);assert(calls.every(([path,args])=>path.startsWith('/v2/catalog/list?types=ITEM')&&!args.length));
});
test('creation discovery refuses missing proof and cursor loops without any write',async()=>{
 const square=new Square({});let calls=0;square.request=async()=>{calls++;return {objects:[],cursor:'same'};};
 await assert.rejects(square.findCreatedItem({}),{status:409});assert.equal(calls,0);
 await assert.rejects(square.findCreatedItem(body),{status:503});assert.equal(calls,2);
});
test('authentication failure reports only safe status/code and stops further Square calls',async()=>{
 let calls=0;const manager={env:{RUNTIME_TIER:'staging',SQUARE_LOCATION_ID:'offline',SQUARE_SANDBOX_ACCESS_TOKEN:'never-include-in-report'},s:{product:async()=>({draft:{variants:[{id:'offline'}]}}),locked:async()=>[]},square:{request:async()=>{calls++;throw Object.assign(Error('private upstream detail'),{upstreamStatus:401,squareCode:'UNAUTHORIZED'});}}};
 const result=await inspectSync(manager,'offline');assert.equal(result.connection.httpStatus,401);assert.equal(result.connection.squareCode,'UNAUTHORIZED');assert.equal(calls,1);assert(!JSON.stringify(result).includes('private upstream'));assert(!JSON.stringify(result).includes('never-include-in-report'));
});
test('staging diagnostics cannot access production resources',async()=>{
 await assert.rejects(inspectSync({env:{RUNTIME_TIER:'production'}},'offline'),{status:403});
});
