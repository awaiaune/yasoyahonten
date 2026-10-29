// Validation Worker only. Never trust an unsigned identity header.
import { assertRuntime } from './safety.js';
export class AccessDenied extends Error {
    constructor(code='ACCESS_INVALID_TOKEN'){super('Validation access denied');this.code=code;}
}
const deny = (code) => { throw new AccessDenied(code); };
function decode(part) {
    if (!/^[A-Za-z0-9_-]+$/.test(part)) deny();
    const bytes=Uint8Array.from(atob(part.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-part.length%4)%4)),c=>c.charCodeAt(0));
    return bytes;
}
export async function assertAccess(request, env, {fetcher=fetch, now=Date.now()}={}) {
    const m=assertRuntime(env),token=request.headers.get('Cf-Access-Jwt-Assertion');
    try {
        if (!token) deny('ACCESS_JWT_MISSING');
        if(token.length>16384) deny();
        const parts=token.split('.');if(parts.length!==3)deny();
        const header=JSON.parse(new TextDecoder().decode(decode(parts[0])));
        const claims=JSON.parse(new TextDecoder().decode(decode(parts[1])));
        const issuer=`https://${m.accessTeamDomain}`,seconds=Math.floor(now/1000);
        if(header.alg!=='RS256'||typeof header.kid!=='string'||header.kid.length>256)deny();
        if(claims.iss!==issuer)deny('ACCESS_ISSUER_MISMATCH');
        if(claims.email!==m.notificationEmail)deny('ACCESS_EMAIL_MISMATCH');
        const aud=Array.isArray(claims.aud)?claims.aud:[claims.aud];if(!aud.includes(m.accessAudience))deny('ACCESS_AUDIENCE_MISMATCH');
        if(!Number.isFinite(claims.exp)||claims.exp<=seconds||!Number.isFinite(claims.iat)||claims.iat>seconds+60)deny('ACCESS_TOKEN_TIME_INVALID');
        if(claims.nbf!==undefined&&(!Number.isFinite(claims.nbf)||claims.nbf>seconds))deny('ACCESS_TOKEN_TIME_INVALID');
        const response=await fetcher(`${issuer}/cdn-cgi/access/certs`,{redirect:'manual',signal:AbortSignal.timeout(5000)});
        if(response.status!==200)deny('ACCESS_CERTS_HTTP_ERROR');
        const raw=await response.text();if(raw.length>65536)deny();
        const jwks=JSON.parse(raw);if(!Array.isArray(jwks.keys)||jwks.keys.length>10)deny();
        const keys=jwks.keys.filter(k=>k.kid===header.kid&&k.kty==='RSA'&&(!k.alg||k.alg==='RS256')&&(!k.use||k.use==='sig'));
        if(keys.length!==1)deny('ACCESS_SIGNING_KEY_MISMATCH');
        const key=await crypto.subtle.importKey('jwk',keys[0],{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
        if(!await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,decode(parts[2]),new TextEncoder().encode(parts[0]+'.'+parts[1])))deny('ACCESS_SIGNATURE_INVALID');
    } catch(error) { if(error instanceof AccessDenied)throw error;deny('ACCESS_VERIFICATION_FAILED'); }
}
