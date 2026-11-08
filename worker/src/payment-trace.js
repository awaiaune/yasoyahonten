import {SQUARE_ERROR_CODES} from './square-error-codes.js';
// Separate bounded, expiring diagnostic journal. Never mutates purchase attempts,
// holds, orders or mail tasks. Client observations are explicitly untrusted.
export const TRACE_RETENTION_MS=7*24*60*60*1000;
const MAX_TRACES=200, MAX_EVENTS=64;
const clientStages=new Set(['pay_click','sdk_start','sdk_ok','sdk_failed','csp_blocked','payment_dispatch']);
const serverStages=new Set(['square_send','square_response','square_unknown','payment_paid','payment_declined','payment_unknown','inventory_applied','inventory_pending','order_stored','order_pending','mail_state']);
const directives=new Set(['frame-src','child-src','form-action','connect-src','script-src','script-src-elem','font-src']);
const codes=new Set(SQUARE_ERROR_CODES);
const mailStates=new Set(['unrecorded','pending','unknown','accepted','delivered','manual_review']);
export const validTraceId=id=>typeof id==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(id);
function sanitize(event,source){
 if(!event||!(source==='browser'?clientStages:serverStages).has(event.stage))return null;
 const out={stage:event.stage,source};
 if(source==='browser'){
  if(Number.isInteger(event.sequence)&&event.sequence>0&&event.sequence<=100)out.sequence=event.sequence;
  if(['pay_click','sdk_start'].includes(event.stage)&&typeof event.activation==='boolean')out.activation=event.activation;
  if(event.stage==='csp_blocked'&&directives.has(event.directive))out.directive=event.directive;
 }else{
  if(Number.isInteger(event.httpStatus)&&event.httpStatus>=100&&event.httpStatus<=599)out.httpStatus=event.httpStatus;
  // Read from provider response headers only, never from a browser payload.
  if(typeof event.requestId==='string'&&/^[A-Za-z0-9_-]{1,128}$/.test(event.requestId))out.requestId=event.requestId;
  if(Array.isArray(event.codes))out.codes=[...new Set(event.codes.filter(c=>codes.has(c)))].slice(0,8);
  for(const recipient of ['admin','customer'])if(mailStates.has(event[recipient]))out[recipient]=event[recipient];
 }
 return out;
}
export class PaymentTrace {
 constructor(storage,now=()=>Date.now()){this.storage=storage;this.now=now;}
 async prune(){
  const all=await this.storage.list({prefix:'payment-trace:',limit:MAX_TRACES+1});
  for(const [key,r]of all)if(!Number.isFinite(r.expiresAt)||r.expiresAt<=this.now()){await this.storage.delete(key);all.delete(key);}
  const rows=[...all.entries()].sort((a,b)=>Number(a[1].events.some(e=>e.source==='server'))-Number(b[1].events.some(e=>e.source==='server'))||a[1].createdAt-b[1].createdAt);
  while(rows.length>MAX_TRACES){const [key]=rows.shift();await this.storage.delete(key);}
  if(rows.length){const at=Math.min(...rows.map(([,r])=>r.expiresAt)),old=await this.storage.getAlarm();if(!old||old<=this.now()||at<old)await this.storage.setAlarm(Math.max(this.now()+1000,at));}
  return rows.map(([,r])=>r);
 }
 async append(id,events,source='server'){
  if(!validTraceId(id)||!Array.isArray(events)||events.length>16)return;
  const safe=events.map(e=>sanitize(e,source)).filter(Boolean);if(!safe.length)return;
  const key='payment-trace:'+id,now=this.now();
  let record=await this.storage.get(key);
  if(source==='browser'&&(!record||record.expiresAt<=now)){
   const existing=await this.storage.list({prefix:'payment-trace:',limit:MAX_TRACES+1});
   if([...existing.values()].filter(r=>r.expiresAt>now).length>=MAX_TRACES)return;
  }
  if(!record||record.expiresAt<=now)record={attemptId:id,serverRelease:'payment-auth-activation-20261105',createdAt:now,expiresAt:now+TRACE_RETENTION_MS,events:[]};
  // Client spam cannot displace server evidence, nor extend retention.
  for(const event of safe){
   if(source==='browser'&&record.events.filter(e=>e.source==='browser').length>=24)continue;
   if(source==='browser'&&record.events.some(e=>e.source==='browser'&&e.sequence===event.sequence&&e.stage===event.stage))continue;
   if(source==='server'&&JSON.stringify({...record.events.at(-1),at:undefined})===JSON.stringify({...event,at:undefined}))continue;
   record.events.push({...event,at:now});
  }
  record.events=record.events.slice(-MAX_EVENTS);
  await this.storage.put(key,record);await this.prune();
 }
 async list(){const rows=await this.storage.list({prefix:'payment-trace:',limit:MAX_TRACES});return [...rows.values()].filter(r=>r.expiresAt>this.now()).sort((a,b)=>b.createdAt-a.createdAt);}
}
