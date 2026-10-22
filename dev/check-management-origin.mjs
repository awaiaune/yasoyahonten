// Offline preflight only. Never prints the supplied URL, identity, environment values or credentials.
import {createInterface} from 'node:readline/promises';
import {Writable} from 'node:stream';
import {pathToFileURL} from 'node:url';
import {managementAccess} from './management-local.mjs';
export function checkManagementOrigin(environment,input) {
 const flags={codespacesFlag:environment.CODESPACES==='true',hasName:!!environment.CODESPACE_NAME,forwardingDomainMatches:environment.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN==='app.github.dev'};
 let access;
 try{access=managementAccess(environment);}catch{return {...flags,configurationMode:'invalid',allowed:false,reason:'INVALID_CODESPACES_METADATA'};}
 let origin;
 try{const url=new URL(input.trim());if(!['https:','http:'].includes(url.protocol)||url.username||url.password)throw Error();origin=url.origin;}catch{return {...flags,configurationMode:access.mode,allowed:false,reason:'INVALID_INPUT_URL'};}
 const headers={host:'localhost:8000',origin};
 try{access.requestUrl(headers,'/api/admin/images');return {...flags,...access.classify(headers),allowed:true,reason:'ALLOWED'};}
 catch(error){return {...flags,allowed:false,...error.localAccess};}
}
export async function probeRunningManagementOrigin(input,fetcher=fetch) {
 let origin;
 try{const url=new URL(input.trim());if(!['http:','https:'].includes(url.protocol)||url.username||url.password)throw Error();origin=url.origin;}catch{return {runningServerCheck:'invalid-input'};}
 try{
  // Fixed loopback destination, GET only; a pasted URL is never fetched.
  const r=await fetcher('http://127.0.0.1:8000/api/health',{method:'GET',headers:{Origin:origin},redirect:'error',signal:AbortSignal.timeout(5000)});
  const data=await r.json().catch(()=>({}));
  const reasons=['HOST_MISSING','HOST_NOT_ALLOWED','ORIGIN_NULL','ORIGIN_MALFORMED','ORIGIN_NOT_ALLOWED','HOST_ORIGIN_PAIR_NOT_ALLOWED','INVALID_TARGET'];
  return {runningServerCheck:'complete',runningServerStatus:r.status,runningServerOriginAccepted:r.status===200,...(reasons.includes(data.error?.reason)?{runningServerReason:data.error.reason}:{})};
 }catch{return {runningServerCheck:'unavailable'};}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 // Suppress terminal echo so the URL is absent from shell history and captured output.
 const output=new Writable({write(_chunk,_encoding,done){done();}});
 const rl=createInterface({input:process.stdin,output,terminal:!!process.stdin.isTTY});
 process.stderr.write('Private 8000 URL: paste the browser URL, then Enter (input hidden; '+(process.argv.includes('--live')?'loopback health GET only':'offline check')+').\n');
 try{
  const input=await rl.question('');
  const environment={CODESPACES:process.env.CODESPACES,CODESPACE_NAME:process.env.CODESPACE_NAME,GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN};
  const report=checkManagementOrigin(environment,input);if(process.argv.includes('--live'))Object.assign(report,await probeRunningManagementOrigin(input));console.log(JSON.stringify(report,null,2));process.exitCode=report.allowed&&report.runningServerOriginAccepted!==false?0:1;
 }catch{console.log(JSON.stringify({allowed:false,reason:'INPUT_UNAVAILABLE'}));process.exitCode=1;}
 finally{rl.close();}
}
