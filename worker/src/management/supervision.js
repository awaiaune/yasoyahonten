import {production,productionPolicy} from '../production-policy.js';
import {externalPolicy} from '../external-policy.js';
// Shared by startup, DO Alarm and independent scheduled watchdog. No public endpoint.
// External effects still run in the existing purchase DO's serialized queue.
const WATCHDOG_MS=60000, STALLED_MS=15*60000, RETRY_WINDOW_MS=3600000;
export class Supervision {
 constructor(manager,services={}){this.m=manager;this.s=manager.s;this.storage=manager.storage;this.services=services;}
 time(){return this.services.now?.()??Date.now();}
 async alarmState(state){try{await this.s.run("INSERT INTO mg_management_monitor(id,alarm_state,updated_at) VALUES(1,?,?) ON CONFLICT(id) DO UPDATE SET alarm_state=excluded.alarm_state,updated_at=excluded.updated_at",[state,new Date(this.time()).toISOString()]);}catch{console.error('Management monitor state requires review');}}
 async arm(at=this.time()+1000){
  try{const current=await this.storage.getAlarm();if(!current||current<=this.time()||at<current)await this.storage.setAlarm(at);await this.alarmState('ready');return true;}
  catch{await this.alarmState('failed');console.error('Management recovery alarm unavailable; durable jobs retained for watchdog');return false;}
 }
 async schedule(){
  try{
   const notifications=externalPolicy(this.m.env).mail?" UNION ALL SELECT next_due AS due FROM mg_job_notifications WHERE state IN ('pending','blocked')":'';
   const row=await this.s.one("SELECT MIN(due) AS due FROM (SELECT next_due AS due FROM mg_jobs WHERE state IN ('queued','running','retry')"+notifications+")");
   return await this.arm(row?.due===null||row?.due===undefined?this.time()+WATCHDOG_MS:Math.max(this.time()+1000,Math.min(row.due,this.time()+WATCHDOG_MS)));
  }catch{await this.alarmState('failed');return false;}
 }
 async scan(){
  const at=this.time(),iso=new Date(at).toISOString();
  // Expired unknown results never get a new key or an unconditional external replay.
  await this.s.run("UPDATE mg_jobs SET state='review',last_error='安全な再試行期限を超えました。照合が必要です。',updated_at=? WHERE state IN ('queued','running','retry') AND result_json IS NULL AND (created_at<=? OR attempts>=8)",[iso,new Date(at-RETRY_WINDOW_MS).toISOString()]);
  await this.s.run("UPDATE mg_inventory_operations SET state='review' WHERE id IN (SELECT id FROM mg_jobs WHERE kind='stock' AND state='review') AND state!='review'");
  const rows=await this.s.all("SELECT id,kind,resource_id,state FROM mg_jobs j WHERE (state='review' OR (state IN ('queued','running','retry') AND created_at<=?)) AND NOT EXISTS(SELECT 1 FROM mg_job_notifications n WHERE n.job_id=j.id) ORDER BY created_at,id LIMIT 100",[new Date(at-STALLED_MS).toISOString()]);
  for(const row of rows){
   const payload={jobId:row.id,kind:row.kind,resourceId:row.resource_id,event:row.state==='review'?'review':'stalled'};
   await this.s.run('INSERT OR IGNORE INTO mg_job_notifications(job_id,payload_json,next_due,created_at) VALUES(?,?,?,?)',[row.id,JSON.stringify(payload),at,iso]);
  }
  await this.s.run("UPDATE mg_job_notifications SET state='cancelled' WHERE state IN ('pending','blocked') AND job_id IN (SELECT id FROM mg_jobs WHERE state='done')");
  await this.s.run("INSERT INTO mg_management_monitor(id,last_scan_at,updated_at) VALUES(1,?,?) ON CONFLICT(id) DO UPDATE SET last_scan_at=excluded.last_scan_at,updated_at=excluded.updated_at",[iso,iso]);
 }
 async notify(){
  if(production(this.m.env)||!externalPolicy(this.m.env).mail)return;
  // One immutable payload and one provider key per job; never reset sent/expired rows.
  const n=await this.s.one("SELECT n.* FROM mg_job_notifications n JOIN mg_jobs j ON j.id=n.job_id WHERE n.state IN ('pending','blocked') AND n.next_due<=? AND j.state!='done' ORDER BY n.next_due,n.job_id LIMIT 1",[this.time()]);if(!n)return;
  if(!this.services.notify){await this.s.run("UPDATE mg_job_notifications SET state='blocked',next_due=?,last_error='通知設定が未完了です。' WHERE job_id=?",[this.time()+300000,n.job_id]);return;}
  if(n.attempts>=8||(n.first_attempt_at!==null&&this.time()-n.first_attempt_at>=RETRY_WINDOW_MS)){await this.s.run("UPDATE mg_job_notifications SET state='expired',last_error='通知結果は要確認です。新しいキーで再送しないでください。' WHERE job_id=?",[n.job_id]);return;}
  await this.s.run("UPDATE mg_job_notifications SET state='pending',attempts=attempts+1,first_attempt_at=COALESCE(first_attempt_at,?),next_due=? WHERE job_id=?",[this.time(),this.time()+60000,n.job_id]);
  try{
   const accepted=await this.services.notify(JSON.parse(n.payload_json),'management-sync-'+n.job_id);
   if(!accepted)throw Error('Notification not acknowledged');
   await this.s.run("UPDATE mg_job_notifications SET state='sent',sent_at=?,last_error=NULL WHERE job_id=?",[new Date(this.time()).toISOString(),n.job_id]);
  }catch{await this.s.run("UPDATE mg_job_notifications SET last_error='通知結果を確認できません。同じキーで再確認します。',next_due=? WHERE job_id=?",[this.time()+Math.min(300000,15000*2**n.attempts),n.job_id]);}
 }
 async status(){
  const state=await this.s.one('SELECT * FROM mg_management_monitor WHERE id=1');
  return {lastScanAt:state?.last_scan_at||null,alarmState:state?.alarm_state||'unknown',notificationAttention:(await this.s.one("SELECT COUNT(*) AS n FROM mg_job_notifications WHERE state IN ('blocked','expired')")).n};
 }
 async tick({run=true}={}){
  if(externalPolicy(this.m.env).readOnly||production(this.m.env)&&!productionPolicy(this.m.env).catalog&&!productionPolicy(this.m.env).inventory)return;
  try{await this.scan();if(run){const next=await this.s.one("SELECT id FROM mg_jobs WHERE state IN ('queued','running','retry') AND next_due<=? ORDER BY next_due,created_at LIMIT 1",[this.time()]);if(next)await this.m.run(next.id);await this.scan();await this.notify();}}
  finally{await this.schedule();}
 }
}
