import {ProductionError} from '../worker/src/production-policy.js';
export async function assertProductionAdmin(request,env,{fetcher=fetch,now=Date.now()}={}){
 const deny=()=>{throw new ProductionError('PRODUCTION_ADMIN_DENIED','管理者認証が必要です。',401);};
 try{
  const host=env.PRODUCTION_ADMIN_ORIGIN,team=env.PRODUCTION_ACCESS_TEAM_DOMAIN,aud=env.PRODUCTION_ACCESS_AUDIENCE,email=env.PRODUCTION_ADMIN_EMAIL;
  if(!/^https:\/\/[a-z0-9-]+\.awaiaune\.com$/.test(host||'')||['https://validation.awaiaune.com','https://yasoyahonten.awaiaune.com'].includes(host)||! /^[a-z0-9-]+\.cloudflareaccess\.com$/.test(team||'')||! /^[a-f0-9]{64}$/.test(aud||'')||!email)deny();
  const origin=request.headers.get('Origin');if(origin&&origin!==host)deny();if(!['GET','HEAD'].includes(request.method)&&origin!==host)deny();
  const token=request.headers.get('Cf-Access-Jwt-Assertion');if(!token||token.length>16384)deny();
  const parts=token.split('.');if(parts.length!==3)deny();const decode=s=>{if(!/^[A-Za-z0-9_-]+$/.test(s))deny();return Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-s.length%4)%4)),c=>c.charCodeAt(0));};
  const header=JSON.parse(new TextDecoder().decode(decode(parts[0]))),claims=JSON.parse(new TextDecoder().decode(decode(parts[1]))),seconds=Math.floor(now/1000),issuer='https://'+team;
  if(header.alg!=='RS256'||typeof header.kid!=='string'||header.kid.length>256||claims.iss!==issuer||claims.email!==email||!(Array.isArray(claims.aud)?claims.aud:[claims.aud]).includes(aud)||!Number.isFinite(claims.exp)||claims.exp<=seconds||!Number.isFinite(claims.iat)||claims.iat>seconds+60||claims.nbf!==undefined&&(!Number.isFinite(claims.nbf)||claims.nbf>seconds))deny();
  const response=await fetcher(issuer+'/cdn-cgi/access/certs',{redirect:'manual',signal:AbortSignal.timeout(5000)});if(response.status!==200)deny();const raw=await response.text();if(raw.length>65536)deny();const keys=JSON.parse(raw).keys;if(!Array.isArray(keys)||keys.length>10)deny();
  const match=keys.filter(k=>k.kid===header.kid&&k.kty==='RSA'&&(!k.alg||k.alg==='RS256')&&(!k.use||k.use==='sig'));if(match.length!==1)deny();
  const key=await crypto.subtle.importKey('jwk',match[0],{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);if(!await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,decode(parts[2]),new TextEncoder().encode(parts[0]+'.'+parts[1])))deny();
 }catch{deny();}
}
