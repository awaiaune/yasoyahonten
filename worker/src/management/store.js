import {production} from '../production-policy.js';
import { need, now } from './domain.js';
export class Store {
 constructor(env){this.db=env.ORDERS_DB;this.env=env;}
 stmt(sql,args=[]){return this.db.prepare(sql).bind(...args);}
 async one(sql,args=[]){return this.stmt(sql,args).first();}
 async all(sql,args=[]){return (await this.stmt(sql,args).all()).results||[];}
 async run(sql,args=[]){return this.stmt(sql,args).run();}
 async batch(items){return this.db.batch(items.map(([sql,args])=>this.stmt(sql,args)));}
 audit(actor,action,id,detail){return ['INSERT INTO mg_audit VALUES(?,?,?,?,?,?)',[crypto.randomUUID(),actor,action,id,JSON.stringify(detail),now()]];}
 async product(id){const p=await this.one('SELECT * FROM mg_products WHERE id=?',[id]);if(!p)return null;const r=await this.one('SELECT data_json FROM mg_revisions WHERE product_id=? AND revision=?',[id,p.draft_revision]);return {...p,draft:JSON.parse(r.data_json)};}
 async products(){const rows=await this.all('SELECT p.*,r.data_json FROM mg_products p JOIN mg_revisions r ON r.product_id=p.id AND r.revision=p.draft_revision ORDER BY p.sort_order,p.id');return rows.map(p=>{const {data_json,...row}=p;return {...row,draft:JSON.parse(data_json)};});}
 async publicProducts(){
  const rows=await this.all("SELECT p.*,r.data_json FROM mg_products p JOIN mg_revisions r ON r.product_id=p.id AND r.revision=p.published_revision WHERE p.status IN ('published','stopped') ORDER BY p.sort_order,p.id");
  return rows.map(p=>({id:p.id,slug:p.slug,status:p.status,revision:p.published_revision,...JSON.parse(p.data_json)}));
 }
 async catalog(){
  const products=await this.publicProducts(),maps=await this.all('SELECT * FROM mg_mappings');const byId=new Map(maps.map(m=>[m.variant_id,m]));const result={};
  for(const p of products)for(const v of p.variants){const m=byId.get(v.id);need(m?.environment===(production(this.env)?'production':'sandbox')&&m.location_id===this.env.SQUARE_LOCATION_ID,'公開商品のSquare対応表がありません。',503);result[v.id]={...v,active:p.status==='published'&&v.active,squareVariationId:m.variation_id,revision:p.revision};}
  return result;
 }
 async locked(ids){if(!ids.length)return [];const rows=await this.all('SELECT * FROM mg_locks');return rows.filter(r=>ids.includes(r.variant_id));}
 async assertUnlocked(ids){need(!(await this.locked(ids)).length,'この商品は同期・在庫確認中です。',409);}
}
export async function loadCatalog(env){env.MANAGED_CATALOG=await new Store(env).catalog();return env.MANAGED_CATALOG;}
