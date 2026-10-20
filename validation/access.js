// Validation Worker only. Never trust an unsigned identity header.
import { assertRuntime } from './safety.js';
export class AccessDenied extends Error {}
const deny = () => { throw new AccessDenied('Validation access denied'); };
function decode(part) {
    if (!/^[A-Za-z0-9_-]+$/.test(part)) deny();
    const bytes=Uint8Array.from(atob(part.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-part.length%4)%4)),c=>c.charCodeAt(0));
    return bytes;
}
export async function assertAccess(request, env, {fetcher=fetch, now=Date.now()}={}) {
    const m=assertRuntime(env),token=request.headers.get('Cf-Access-Jwt-Assertion');
    try {
        if (!token || token.length>16384) deny();
        const parts=token.split('.');if(parts.length!==3)deny();
        const header=JSON.parse(new TextDecoder().decode(decode(parts[0])));
        const claims=JSON.parse(new TextDecoder().decode(decode(parts[1])));
        const issuer=`https://${m.accessTeamDomain}`,seconds=Math.floor(now/1000);
        if(header.alg!=='RS256'||typeof header.kid!=='string'||header.kid.length>256)deny();
        if(claims.iss!==issuer||claims.email!==m.notificationEmail)deny();
        const aud=Array.isArray(claims.aud)?claims.aud:[claims.aud];if(!aud.includes(m.accessAudience))deny();
        if(!Number.isFinite(claims.exp)||claims.exp<=seconds||!Number.isFinite(claims.iat)||claims.iat>seconds+60)deny();
        if(claims.nbf!==undefined&&(!Number.isFinite(claims.nbf)||claims.nbf>seconds))deny();
        const response=await fetcher(`${issuer}/cdn-cgi/access/certs`,{redirect:'manual',signal:AbortSignal.timeout(5000)});
        if(response.status!==200)deny();
        const raw=await response.text();if(raw.length>65536)deny();
        const jwks=JSON.parse(raw);if(!Array.isArray(jwks.keys)||jwks.keys.length>10)deny();
        const keys=jwks.keys.filter(k=>k.kid===header.kid&&k.kty==='RSA'&&(!k.alg||k.alg==='RS256')&&(!k.use||k.use==='sig'));
        if(keys.length!==1)deny();
        const key=await crypto.subtle.importKey('jwk',keys[0],{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
        if(!await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,decode(parts[2]),new TextEncoder().encode(parts[0]+'.'+parts[1])))deny();
    } catch { deny(); }
}
