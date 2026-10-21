import { CATALOG } from '../catalog.js';
import { assertDatabase } from '../../../validation/safety.js';
export class ManagementError extends Error { constructor(status,message){super(message);this.status=status;} }
export function need(ok,message,status=400){if(!ok)throw new ManagementError(status,message);}
export function enabled(env){return env.MANAGEMENT_ENABLED==='1';}
export async function guard(env){
 need(enabled(env),'商品管理は無効です。',404);
 need(env.SQUARE_ENVIRONMENT==='sandbox','商品管理はSandbox専用です。',503);
 if(env.RUNTIME_TIER==='sandbox-validation') await assertDatabase(env);
 else need(env.LOCAL_TEST_MODE==='1'&&env.LOCAL_SQUARE,'外部接続を許可しないローカル構成が必要です。',503);
 need(env.ORDERS_DB,'管理DBが未設定です。',503);
}
export function text(value,max,required=true){need(typeof value==='string'&&value.length<=max&&(!required||value.trim()),'入力文字数を確認してください。');return value.trim();}
export function integer(value,min,max){need(Number.isSafeInteger(value)&&value>=min&&value<=max,'数値の範囲を確認してください。');return value;}
export function identifier(v){need(typeof v==='string'&&/^[a-z0-9][a-z0-9-]{0,79}$/.test(v),'識別子が正しくありません。');return v;}
export function operation(v){need(typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(v),'操作IDが必要です。');return v;}
export function squareId(v){need(typeof v==='string'&&/^[A-Z0-9]{8,64}$/.test(v)&&!Object.values(CATALOG).some(p=>p.squareVariationId===v),'Sandbox専用のSquare IDが必要です。');return v;}
export async function digest(value){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(value))))].map(v=>v.toString(16).padStart(2,'0')).join('');}
export function draft(input){
 need(input&&Array.isArray(input.variants)&&input.variants.length>0&&input.variants.length<=20,'1〜20件のバリエーションが必要です。');
 const variants=input.variants.map(v=>({id:identifier(v.id),name:text(v.name,120),price:integer(v.price,1,10000000),amount:text(v.amount||'',120,false),maxQuantity:integer(v.maxQuantity??10,1,10),active:v.active!==false}));
 need(new Set(variants.map(v=>v.id)).size===variants.length,'バリエーションIDが重複しています。');
 const images=input.images||[];need(Array.isArray(images)&&images.length<=10&&images.every(i=>/^[a-f0-9]{64}$/.test(i))&&new Set(images).size===images.length,'画像の指定が正しくありません。');
 return {name:text(input.name,120),description:text(input.description||'',8000,false),variants,images,alt:text(input.alt||input.name,200),sortOrder:integer(input.sortOrder??0,0,100000)};
}
export const now=()=>new Date().toISOString();
export const json=value=>JSON.stringify(value);
