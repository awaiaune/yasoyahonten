// Safe release diagnostics. Raw subprocess output, credentials and config vars
// are never returned or saved on failure. This module cannot deploy.
import {writeFile,mkdir} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import path from 'node:path';
import {checkProfile} from './prepare-checkout-v58.mjs';
const run=promisify(execFile);
const SAFE_CODES=new Set('REPOSITORY_MISMATCH RESUME_VERSION_MISMATCH RESUME_VARIABLES_MISMATCH ACCOUNT_ENDPOINT_REJECTED ADDITIONAL_D ADDITIONAL_DO_REQUIRES_REVIEW ADDITIONAL_R ASSET_LINK_OR_SPECIAL_FILE ASSET_SETTINGS_EVIDENCE_CONFLICT ASSET_SETTINGS_EVIDENCE_IDENTITY_MISMATCH AUTH_CREDENTIAL_FORMAT_INVALID CATALOG_INVENTORY_OR_RETIREMENT_GUARD_INVALID CHECKOUT_OFF_INPUT_REQUIRED CHECKOUT_ON_PROFILE_REQUIRED CONFIRMED_DATABASE_BINDING_MISMATCH COPIED_ASSET_CHANGED CURRENT_PAGE_RESOURCE_MISSING CUSTOM_BUILD_HOOK_REQUIRES_REVIEW CUSTOM_DOMAIN_IDENTITY_MISMATCH D DATABASE_PROVENANCE_MISMATCH DOMAINS_RESPONSE_INVALID DYNAMIC_STORE_CONFIG_STUB_REQUIRED EVIDENCE_IDENTITY_MISMATCH EXISTING_ASSETS_REQUIRED EXISTING_CUSTOM_DOMAIN_REQUIRED EXISTING_D EXISTING_DO_REQUIRED EXISTING_INVENTORY_APPROVAL_REQUIRED EXISTING_MANAGEMENT_REQUIRED EXISTING_OFF_PROFILE_NOT_FOUND EXISTING_R FETCH_HEAD_INVALID INLINE_CREDENTIAL_OR_ALTERNATE_PROFILE INPUT_MUST_BE_REGULAR_FILE INPUT_MUST_NOT_BE_OVERWRITTEN INVALID_ARGUMENTS INVALID_CRON INVALID_JSON INVALID_JSONC INVALID_OR_DUPLICATE_BINDING LIVE_ASSET_MISMATCH LIVE_DATABASE_IDENTITY_MISMATCH LIVE_NAMESPACE_IDENTITY_MISMATCH LIVE_OFF_FLAGS_INVALID LIVE_SETTINGS_CHANGED_SINCE_VERSION LOCAL_PREPARATION_FAILED MANAGED_CHECKOUT_FLAG_INVALID MANAGED_CHECKOUT_OFF_REQUIRED METADATA_HTTP_ERROR METADATA_NETWORK_FAILED METADATA_PAGINATION_REQUIRES_REVIEW METADATA_RESPONSE_NOT_JSON MISSING_EVIDENCE NON_PRODUCTION_BINDING OUTPUT_EXISTS OUTPUT_EXISTS_NOT_OVERWRITTEN OUTPUT_MUST_SHARE_CONFIG_DIRECTORY OUTPUT_OVERLAPS_EXISTING_INPUT OUTPUT_WRITE_FAILED P PLAINTEXT_CREDENTIAL_IN_INPUT PRODUCTION_BINDING_MISSING PRODUCTION_DO_MISMATCH PRODUCTION_IDENTITY_INVALID PRODUCTION_RESOURCE_MISMATCH PROFILE_MODE_INVALID REQUIRED_SECRET_NAME_MISSING RESUME_RUNTIME_DIFFERS RESUME_SOURCE_UNVERIFIED ROUTE_ZONE_MISSING SALES_VERIFICATION_PROFILE_REQUIRED SANDBOX_OR_LOCAL_BINDING_FORBIDDEN SAVED_VERSION_CONTENT_MISMATCH SECRET_VALUE_IN_INPUT SNAPSHOT_IS_NOT_SOLE_ACTIVE_VERSION SOURCE_ASSETS_CHANGED_DURING_COPY STOREFRONT_ENTRY_INVALID UNSAFE_DRY_RUN_PROFILE UNSUPPORTED_ASSET_SETTING UNSUPPORTED_BINDING_TYPE USAGE_EXISTING_OFF_PROFILE_AND_NEW_OUTPUT_REQUIRED VERSION_BINDINGS_MISSING VERSION_JSON_PATH_REQUIRED VERSION_RUNTIME_MISSING WORKER_FIRST_REQUIRED WRANGLER_AUTH_RESPONSE_INVALID WRANGLER_AUTH_UNAVAILABLE WRANGLER_DRY_RUN_FAILED'.split(' '));
export function safeReleaseDiagnostic(stage,error){
 const message=String(error?.message||''),prefix=message.split(':')[0];
 const code=SAFE_CODES.has(prefix)?prefix:'LOCAL_PREPARATION_FAILED';
 const result={stage,code};
 if(error?.name==='SyntaxError')result.code='INVALID_JSON';
 if(Array.isArray(error?.missing))result.missing=error.missing.filter(k=>['routes','domains','subdomain','database_name','namespace','schedules','asset_routing','asset_directory'].includes(k));
 if(/^\/accounts\/[a-f0-9]+\/(?:workers|d1)\/[A-Za-z0-9/_-]+$/.test(error?.endpoint||''))result.endpoint=error.endpoint;
 if(['ENOENT','EACCES','EPERM','ENOSPC','ENOTDIR','EEXIST'].includes(error?.code))result.errno=error.code;
 if(Number.isInteger(error?.code))result.exitCode=error.code;
 if(['SIGTERM','SIGKILL','SIGABRT'].includes(error?.signal))result.signal=error.signal;
 if(Number.isInteger(error?.http))result.http=error.http;
 if(Array.isArray(error?.codes))result.cloudflareCodes=error.codes.filter(Number.isInteger);
 if(Array.isArray(error?.metadataReadFailures))result.readFailures=error.metadataReadFailures.filter(f=>['routes','domains','subdomain','database_name','namespace','schedules'].includes(f.field)).map(f=>({field:f.field,http:Number.isInteger(f.http)?f.http:null,codes:Array.isArray(f.codes)?f.codes.filter(Number.isInteger):[],...(f.field==='database_name'&&error.databaseIdentityConfirmed?{identityCorroborated:true}:{})}));
 // Classify only fixed known compiler/CLI patterns. Never echo arbitrary text.
 const output=String(error?.stderr||'');
 const patterns=[[/Missing file or directory:.*[\\/]\.wrangler/i,'WRANGLER_LOCAL_CONFIG_DIRECTORY_MISSING'],[/A file or directory could not be found/i,'LOCAL_FILE_MISSING'],[/Could not resolve|Cannot find module|ERR_MODULE_NOT_FOUND/i,'BUNDLE_DEPENDENCY_MISSING'],[/Invalid JSON|Unexpected token.*JSON/i,'INVALID_JSON'],[/Processing .*configuration|Invalid configuration|Unknown argument|Unknown arguments|Unexpected fields/i,'WRANGLER_CONFIG_REJECTED'],[/No entry.point|Missing entry.point/i,'ENTRYPOINT_MISSING'],[/npm error code ENOENT|npm ERR! code ENOENT/i,'NPM_LOCAL_PATH_MISSING'],[/ENOSPC|no space left/i,'LOCAL_DISK_FULL'],[/EACCES|EPERM|permission denied/i,'LOCAL_PERMISSION_DENIED'],[/ENOTFOUND|ECONNRESET|ETIMEDOUT|fetch failed/i,'SUBPROCESS_NETWORK_ERROR'],[/Unsupported engine|requires at least Node|not supported.*Node/i,'NODE_VERSION_UNSUPPORTED']];
 const rules=patterns.filter(([re])=>re.test(output)).map(([,name])=>name);
 if(error?.killed&&error?.signal==='SIGTERM')rules.push('SUBPROCESS_TIMEOUT');
 if(rules.length)result.rules=[...new Set(rules)];
 return result;
}
export async function runOffDryRun(profile,directory,deps={}){
 const c=await checkProfile(profile,'off');
 if(c.vars.PRODUCTION_MANAGED_CHECKOUT_ENABLED!=='0'||c.build?.command||['env','define','unsafe','secrets'].some(k=>Object.hasOwn(c,k))||Object.keys(c.vars).some(k=>/(TOKEN|SECRET|PASSWORD|API_KEY|PRIVATE_KEY)/i.test(k)))throw Error('UNSAFE_DRY_RUN_PROFILE');
 await mkdir(directory,{recursive:true,mode:0o700});
 const args=['--yes','wrangler@4.155.0','deploy','--dry-run','--config',profile,'--outdir',path.join(directory,'bundle')];
 try{
  await (deps.run??run)('npx',args,{env:{...process.env,WRANGLER_SEND_METRICS:'false',WRANGLER_LOG:'error',WRANGLER_LOG_SANITIZE:'true'},encoding:'utf8',timeout:120000,maxBuffer:8*1024*1024});
  // Successful build needs no raw bindings/config output in the diagnostic log.
  await writeFile(path.join(directory,'diagnostic.json'),JSON.stringify({stage:'wrangler_dry_run',status:'passed',exitCode:0})+'\n',{mode:0o600});
 }catch(cause){
  const diagnostic=safeReleaseDiagnostic('wrangler_dry_run',cause);diagnostic.code='WRANGLER_DRY_RUN_FAILED';
  await writeFile(path.join(directory,'diagnostic.json'),JSON.stringify(diagnostic)+'\n',{mode:0o600});
  const err=Error('WRANGLER_DRY_RUN_FAILED');err.diagnostic=diagnostic;err.directory=directory;throw err;
 }
 return {stage:'wrangler_dry_run',status:'passed',exitCode:0};
}
