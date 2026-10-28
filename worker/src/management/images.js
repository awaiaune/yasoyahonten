import {production,productionGrant} from '../production-policy.js';
import { guard, need, now } from './domain.js';
import { Store } from './store.js';
const MAX=8*1024*1024;
export function inspectImage(bytes,mime){
 need(bytes.length>16&&bytes.length<=MAX,'画像は8MB以下にしてください。',413);
 const d=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);let width,height,ext;
 if(bytes.length>=24&&mime==='image/png'&&[137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v)&&new TextDecoder().decode(bytes.slice(12,16))==='IHDR'){width=d.getUint32(16);height=d.getUint32(20);ext='png';}
 else if(mime==='image/jpeg'&&bytes[0]===255&&bytes[1]===216&&bytes.at(-2)===255&&bytes.at(-1)===217){
  let p=2;while(p+9<bytes.length){if(bytes[p++]!==255)break;const mark=bytes[p++];if(mark===0xd9||mark===0xda)break;const length=d.getUint16(p);need(length>=2&&p+length<=bytes.length,'JPEGが破損しています。');
   if([0xc0,0xc1,0xc2].includes(mark)){height=d.getUint16(p+3);width=d.getUint16(p+5);break;}p+=length;
  }ext='jpg';
 }else if(mime==='image/webp'&&new TextDecoder().decode(bytes.slice(0,4))==='RIFF'&&new TextDecoder().decode(bytes.slice(8,12))==='WEBP'){
  const type=new TextDecoder().decode(bytes.slice(12,16));
  if(type==='VP8X'&&bytes.length>=30){need(!(bytes[20]&2),'アニメーション画像は使用できません。');width=1+bytes[24]+(bytes[25]<<8)+(bytes[26]<<16);height=1+bytes[27]+(bytes[28]<<8)+(bytes[29]<<16);}
  else if(type==='VP8L'&&bytes.length>=25&&bytes[20]===47){const bits=d.getUint32(21,true);width=(bits&0x3fff)+1;height=((bits>>>14)&0x3fff)+1;}
  else if(type==='VP8 '&&bytes.length>=30&&bytes[23]===157&&bytes[24]===1&&bytes[25]===42){width=d.getUint16(26,true)&0x3fff;height=d.getUint16(28,true)&0x3fff;}ext='webp';
 }
 need(ext&&Number.isInteger(width)&&Number.isInteger(height)&&width>0&&height>0&&width<=12000&&height<=12000&&width*height<=40000000,'JPEG/PNG/WebPの静止画を選択してください。');
 return {mime,ext,width,height};
}
export async function uploadImage(request,env){
 await guard(env);productionGrant(env,'images');need(env.PRODUCT_IMAGES,'画像ストレージが未設定です。',503);
 const mime=(request.headers.get('Content-Type')||'').split(';')[0];need(['image/jpeg','image/png','image/webp'].includes(mime),'未対応の画像形式です。',415);
 const reader=request.body?.getReader();need(reader,'画像がありません。');const chunks=[];let size=0;
 for(;;){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>MAX){await reader.cancel();need(false,'画像は8MB以下にしてください。',413);}chunks.push(value);}
 let bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}const info=inspectImage(bytes,mime);bytes=stripImageMetadata(bytes,mime);
 const id=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(v=>v.toString(16).padStart(2,'0')).join('');const key=(production(env)?'production/':'sandbox/')+id+'.'+info.ext;
 await env.PRODUCT_IMAGES.put(key,bytes,{httpMetadata:{contentType:mime}});
 await new Store(env).run('INSERT OR IGNORE INTO mg_images VALUES(?,?,?,?,?,?,?)',[id,key,mime,bytes.length,info.width,info.height,now()]);
 return {id,...info,bytes:bytes.length,previewUrl:'/api/admin/images/'+id};
}
export async function serveImage(id,env,admin=false){
 await guard(env);need(/^[a-f0-9]{64}$/.test(id),'画像IDが正しくありません。',404);
 const s=new Store(env);if(!admin)need((await s.publicProducts()).some(p=>p.images.includes(id)),'画像がありません。',404);
 const row=await s.one('SELECT * FROM mg_images WHERE id=?',[id]);need(row&&env.PRODUCT_IMAGES,'画像がありません。',404);const obj=await env.PRODUCT_IMAGES.get(row.object_key);need(obj,'画像がありません。',404);
 return new Response(obj.body,{headers:{'Content-Type':row.mime,'Content-Security-Policy':"default-src 'none'; sandbox",'X-Content-Type-Options':'nosniff','Cache-Control':admin?'no-store':'public, max-age=300'}});
}

export function stripImageMetadata(bytes,mime){
 const parts=[];const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 if(mime==='image/jpeg'){
  parts.push(bytes.slice(0,2));let p=2;
  while(p<bytes.length){need(bytes[p]===255&&p+1<bytes.length,'JPEG形式が正しくありません。');const mark=bytes[p+1];if(mark===0xda||mark===0xd9){parts.push(bytes.slice(p));break;}need(p+4<=bytes.length,'JPEGが切れています。');const n=view.getUint16(p+2)+2;need(n>=4&&p+n<=bytes.length,'JPEGが切れています。');if(![0xe1,0xe2,0xed,0xfe].includes(mark))parts.push(bytes.slice(p,p+n));p+=n;}
 }else if(mime==='image/png'){
  parts.push(bytes.slice(0,8));let p=8,ended=false,idat=false;
  while(p+12<=bytes.length){const n=view.getUint32(p)+12;need(n>=12&&p+n<=bytes.length,'PNGが切れています。');const type=new TextDecoder().decode(bytes.slice(p+4,p+8));if(!['eXIf','tEXt','zTXt','iTXt'].includes(type))parts.push(bytes.slice(p,p+n));if(type==='IDAT')idat=true;p+=n;if(type==='IEND'){ended=true;break;}}
  need(ended&&idat&&p===bytes.length,'PNG画像データがありません。');
 }else if(mime==='image/webp'){
  need(view.getUint32(4,true)===bytes.length-8,'WebPが切れています。');let p=12;while(p+8<=bytes.length){const n=view.getUint32(p+4,true),size=8+n+(n%2);need(p+size<=bytes.length,'WebPが切れています。');const type=new TextDecoder().decode(bytes.slice(p,p+4));need(!['ANIM','ANMF'].includes(type),'アニメーションは使用できません。');if(!['EXIF','XMP ','ICCP'].includes(type)){const chunk=bytes.slice(p,p+size);if(type==='VP8X')chunk[8]&=~0x2c;parts.push(chunk);}p+=size;}need(p===bytes.length,'WebP形式が正しくありません。');const n=parts.reduce((s,p)=>s+p.length,0);const header=new Uint8Array(12);header.set(new TextEncoder().encode('RIFF'));new DataView(header.buffer).setUint32(4,n+4,true);header.set(new TextEncoder().encode('WEBP'),8);parts.unshift(header);
 }else return bytes;
 const out=new Uint8Array(parts.reduce((n,p)=>n+p.length,0));let p=0;for(const part of parts){out.set(part,p);p+=part.length;}return out;
}
