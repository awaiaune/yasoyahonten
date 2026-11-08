// Safe release diagnostics. Raw subprocess output, credentials and config vars
// are never returned or saved on failure. This module cannot deploy.
import {writeFile,mkdir,mkdtemp,symlink} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import path from 'node:path';
import {checkProfile} from './prepare-checkout-v58.mjs';
const run=promisify(execFile);
const SAFE_CODES=new Set('PLACEMENT_INVALID PLACEMENT_FIELDS_UNSUPPORTED PLACEMENT_CONFLICT PLACEMENT_MODE_REQUIRED PLACEMENT_TARGET_REQUIRED PLACEMENT_EVIDENCE_IDENTITY_MISMATCH PLACEMENT_EVIDENCE_INVALID PLACEMENT_EVIDENCE_CONFLICT PLACEMENT_EVIDENCE_REQUIRED PLACEMENT_VERSION_MISMATCH PLACEMENT_CACHE_UNSAFE ASSET_ROUTING_CONFIG_MISSING ASSET_ROUTING_CONFIG_UNSUPPORTED ASSET_ROUTING_CONFIG_INVALID ASSET_ROUTING_BINDING_MISMATCH ASSET_ROUTING_EVIDENCE_IDENTITY_MISMATCH ASSET_ROUTING_SOURCE_UNVERIFIED ASSET_ROUTING_VERSION_MISMATCH ASSET_ROUTING_EVIDENCE_CONFLICT ASSET_ROUTING_RECORD_SCAN_LIMIT ASSET_ROUTING_CACHE_UNSAFE ASSET_ROUTING_CACHE_INVALID ASSET_ROUTING_EVIDENCE_UNAVAILABLE D1_BINDING_ID_MISSING D1_BINDING_ID_CONFLICT D1_BINDING_ID_MISMATCH VERSION_CACHE_IDENTITY_MISMATCH VERSION_SENSITIVE_VALUE_BLOCKED VERSION_ID_MISMATCH VERSION_PRODUCTION_IDENTITY_MISMATCH VERSION_BINDING_FIELDS_UNSUPPORTED VERSION_ASSET_FIELDS_UNSUPPORTED VERSION_FILE_UNSAFE VERSION_JSON_INVALID VERSION_CACHE_PATH_UNSAFE LIVE_VERSION_CHANGED VERSION_PERSISTENT_CACHE_UNAVAILABLE REPOSITORY_MISMATCH RESUME_VERSION_MISMATCH RESUME_VARIABLES_MISMATCH ACCOUNT_ENDPOINT_REJECTED ADDITIONAL_D ADDITIONAL_DO_REQUIRES_REVIEW ADDITIONAL_R ASSET_LINK_OR_SPECIAL_FILE ASSET_SETTINGS_EVIDENCE_CONFLICT ASSET_SETTINGS_EVIDENCE_IDENTITY_MISMATCH AUTH_CREDENTIAL_FORMAT_INVALID CATALOG_INVENTORY_OR_RETIREMENT_GUARD_INVALID CHECKOUT_OFF_INPUT_REQUIRED CHECKOUT_ON_PROFILE_REQUIRED CONFIRMED_DATABASE_BINDING_MISMATCH COPIED_ASSET_CHANGED CURRENT_PAGE_RESOURCE_MISSING CUSTOM_BUILD_HOOK_REQUIRES_REVIEW CUSTOM_DOMAIN_IDENTITY_MISMATCH D DATABASE_PROVENANCE_MISMATCH DOMAINS_RESPONSE_INVALID DYNAMIC_STORE_CONFIG_STUB_REQUIRED EVIDENCE_IDENTITY_MISMATCH EXISTING_ASSETS_REQUIRED EXISTING_CUSTOM_DOMAIN_REQUIRED EXISTING_D EXISTING_DO_REQUIRED EXISTING_INVENTORY_APPROVAL_REQUIRED EXISTING_MANAGEMENT_REQUIRED EXISTING_OFF_PROFILE_NOT_FOUND EXISTING_R FETCH_HEAD_INVALID INLINE_CREDENTIAL_OR_ALTERNATE_PROFILE INPUT_MUST_BE_REGULAR_FILE INPUT_MUST_NOT_BE_OVERWRITTEN INVALID_ARGUMENTS INVALID_CRON INVALID_JSON INVALID_JSONC INVALID_OR_DUPLICATE_BINDING LIVE_ASSET_MISMATCH LIVE_DATABASE_IDENTITY_MISMATCH LIVE_NAMESPACE_IDENTITY_MISMATCH LIVE_OFF_FLAGS_INVALID LIVE_SETTINGS_CHANGED_SINCE_VERSION LOCAL_PREPARATION_FAILED MANAGED_CHECKOUT_FLAG_INVALID MANAGED_CHECKOUT_OFF_REQUIRED METADATA_HTTP_ERROR METADATA_NETWORK_FAILED METADATA_PAGINATION_REQUIRES_REVIEW METADATA_RESPONSE_NOT_JSON MISSING_EVIDENCE NON_PRODUCTION_BINDING OUTPUT_EXISTS OUTPUT_EXISTS_NOT_OVERWRITTEN OUTPUT_MUST_SHARE_CONFIG_DIRECTORY OUTPUT_OVERLAPS_EXISTING_INPUT OUTPUT_WRITE_FAILED P PLAINTEXT_CREDENTIAL_IN_INPUT PRODUCTION_BINDING_MISSING PRODUCTION_DO_MISMATCH PRODUCTION_IDENTITY_INVALID PRODUCTION_RESOURCE_MISMATCH PROFILE_MODE_INVALID REQUIRED_SECRET_NAME_MISSING RESUME_RUNTIME_DIFFERS RESUME_SOURCE_UNVERIFIED ROUTE_ZONE_MISSING SALES_VERIFICATION_PROFILE_REQUIRED SANDBOX_OR_LOCAL_BINDING_FORBIDDEN SAVED_VERSION_CONTENT_MISMATCH SECRET_VALUE_IN_INPUT SNAPSHOT_IS_NOT_SOLE_ACTIVE_VERSION SOURCE_ASSETS_CHANGED_DURING_COPY STOREFRONT_ENTRY_INVALID UNSAFE_DRY_RUN_PROFILE UNSUPPORTED_ASSET_SETTING UNSUPPORTED_BINDING_TYPE USAGE_EXISTING_OFF_PROFILE_AND_NEW_OUTPUT_REQUIRED VERSION_BINDINGS_MISSING VERSION_JSON_PATH_REQUIRED VERSION_RUNTIME_MISSING WORKER_FIRST_REQUIRED WRANGLER_AUTH_RESPONSE_INVALID WRANGLER_AUTH_UNAVAILABLE WRANGLER_DRY_RUN_FAILED'.split(' '));
// Only schema-known paths and fixed error categories leave child-process memory.
// In particular, never return quoted values, unknown keys, env names, or lines.
const knownFields=new Set(`name account_id main compatibility_date compatibility_flags keep_vars workers_dev preview_urls usage_model route routes assets assets.directory assets.binding assets.run_worker_first assets.html_handling assets.not_found_handling assets.base_path d1_databases d1_databases[].binding d1_databases[].database_name d1_databases[].database_id d1_databases[].migrations_dir durable_objects durable_objects.bindings durable_objects.bindings[].name durable_objects.bindings[].class_name durable_objects.bindings[].script_name durable_objects.bindings[].environment r2_buckets r2_buckets[].binding r2_buckets[].bucket_name r2_buckets[].jurisdiction kv_namespaces kv_namespaces[].binding kv_namespaces[].id services services[].binding services[].service services[].environment services[].entrypoint migrations migrations[].tag migrations[].new_classes migrations[].new_sqlite_classes migrations[].deleted_classes migrations[].renamed_classes migrations[].transferred_classes routes[].pattern routes[].custom_domain routes[].zone_id routes[].zone_name routes[].enabled routes[].previews_enabled observability observability.enabled observability.head_sampling_rate observability.redact_query_string observability.issues observability.issues.enabled observability.logs observability.logs.enabled observability.logs.head_sampling_rate observability.logs.invocation_logs observability.logs.persist observability.logs.destinations observability.traces observability.traces.enabled observability.traces.head_sampling_rate observability.traces.persist observability.traces.destinations placement placement.mode placement.hint placement.region placement.host placement.hostname limits limits.cpu_ms limits.subrequests tail_consumers tail_consumers[].service tail_consumers[].environment triggers triggers.crons vars build build.command tsconfig`.split(' '));
function safeField(field){
 if(typeof field!=='string'||field.length>140||!/^[a-z_][a-z0-9_.\[\]]*$/.test(field))return null;
 const normalized=field.replace(/\[\d{1,3}\]/g,'[]');
 return knownFields.has(normalized)?field:null;
}
export function wranglerErrorDetails(cause){
 const raw=[cause?.stderr,cause?.stdout].filter(x=>typeof x==='string').join('\n').replace(/\x1b\[[0-9;]*m/g,'');
 const tagged=/\[ERROR\]/.test(raw),lines=[];let errorSection=!tagged;
 for(const line of raw.split('\n')){
  if(/\[(?:WARNING|INFO|DEBUG)\]/.test(line))errorSection=false;
  if(/\[ERROR\]/.test(line))errorSection=true;
  if(errorSection)lines.push(line.trim().replace(/^[-•]\s*/,''));
 }
 const errors=lines.join('\n'),issues=[];
 const add=(field,kind,expected)=>{
  const safe=safeField(field);if(!safe)return;
  const issue={path:safe,kind,...(expected?{expected}:{})};
  if(issues.length<16&&!issues.some(x=>JSON.stringify(x)===JSON.stringify(issue)))issues.push(issue);
 };
 for(const line of lines){
  const m=line.match(/^(?:Expected |The field )?["`]([^"`]+)["`] (.*)$/);
  if(m){
   const detail=m[2];
   if(/is (?:a )?required|is required/.test(detail))add(m[1],'REQUIRED');
   else if(/one of/.test(detail))add(m[1],'ENUM');
   else if(/(?:to be|should be|must be|of type)/.test(detail)){
    const expected=detail.match(/(?:of type |should be (?:an? )?|must be (?:an? )?|to be (?:an? )?)(boolean|string|number|object|array)\b/)?.[1];
    add(m[1],'TYPE',expected);
   }else if(/cannot have both|mutually exclusive|requires|can only be/.test(detail))add(m[1],'CONSTRAINT');
  }
  const unexpected=line.match(/^Unexpected fields found in (.*?) field: (.*)$/);
  if(unexpected){
   const parent=unexpected[1]==='top-level'?'':unexpected[1];
   for(const match of unexpected[2].matchAll(/["`]([^"`]+)["`]/g))add(parent?parent+'.'+match[1]:match[1],'UNSUPPORTED_FIELD');
   if(!issues.length&&safeField(parent))add(parent,'UNSUPPORTED_FIELD');
  }
  if(/^Expected exactly one of the following fields/.test(line))for(const match of line.matchAll(/"([^"]+)"/g))add(match[1],'MUTUALLY_EXCLUSIVE');
 }
 const syntax=/Invalid (?:JSON|TOML)|Error parsing|ParseError|Unexpected token|Unterminated string|Expected property name|Expected ","|TOML parse error/i.test(errors);
 const build=/Could not resolve|Cannot find module|ERR_MODULE_NOT_FOUND|Build failed|No matching export|No entry.point|Missing entry.point/i.test(errors);
 const config=/Processing .*configuration|Invalid configuration|Unknown arguments?|Unexpected fields|Expected .* to be|The field .* should be/i.test(errors);
 const phase=syntax?'syntax':build?'build':issues.length?'schema':config?'configuration':'unclassified';
 return {phase,...(issues.length?{issues}:{})};
}
export function safeReleaseDiagnostic(stage,error){
 const message=String(error?.message||''),prefix=message.split(':')[0];
 const code=SAFE_CODES.has(prefix)?prefix:'LOCAL_PREPARATION_FAILED';
 const result={stage,code};
 if(code==='VERSION_BINDING_FIELDS_UNSUPPORTED'){
  if(['plain_text','json','secret_text','d1','durable_object_namespace','r2_bucket','assets','service','kv_namespace','unsupported'].includes(error.bindingType))result.bindingType=error.bindingType;
  if(Array.isArray(error.unsupportedFields))result.unsupportedFields=error.unsupportedFields.filter(k=>/^[a-z_][a-z_]{0,31}$/.test(k));
  if(Number.isInteger(error.redactedFieldCount))result.redactedFieldCount=error.redactedFieldCount;
 }
 if(error?.name==='SyntaxError')result.code='INVALID_JSON';
 if(Array.isArray(error?.missing))result.missing=error.missing.filter(k=>['routes','domains','subdomain','database_name','namespace','schedules','asset_routing','asset_directory'].includes(k));
 if(/^\/accounts\/[a-f0-9]+\/(?:workers|d1)\/[A-Za-z0-9/_-]+$/.test(error?.endpoint||''))result.endpoint=error.endpoint;
 if(['ENOENT','EACCES','EPERM','ENOSPC','ENOTDIR','EEXIST'].includes(error?.code))result.errno=error.code;
 if(Number.isInteger(error?.code))result.exitCode=error.code;
 if(['SIGTERM','SIGKILL','SIGABRT'].includes(error?.signal))result.signal=error.signal;
 if(Number.isInteger(error?.http))result.http=error.http;
 if(Array.isArray(error?.codes))result.cloudflareCodes=error.codes.filter(Number.isInteger);
 if(Array.isArray(error?.metadataReadFailures))result.readFailures=error.metadataReadFailures.filter(f=>['asset_routing','routes','domains','subdomain','database_name','namespace','schedules'].includes(f.field)).map(f=>({field:f.field,http:Number.isInteger(f.http)?f.http:null,codes:Array.isArray(f.codes)?f.codes.filter(Number.isInteger):[],...(f.field==='database_name'&&error.databaseIdentityConfirmed?{identityCorroborated:true}:{})}));
 // Classify only fixed known compiler/CLI patterns. Never echo arbitrary text.
 const output=[error?.stderr,error?.stdout].filter(x=>typeof x==='string').join('\n');
 const patterns=[[/Missing file or directory:.*[\\/]\.wrangler/i,'WRANGLER_LOCAL_CONFIG_DIRECTORY_MISSING'],[/A file or directory could not be found/i,'LOCAL_FILE_MISSING'],[/Could not resolve|Cannot find module|ERR_MODULE_NOT_FOUND/i,'BUNDLE_DEPENDENCY_MISSING'],[/Invalid JSON|Unexpected token.*JSON/i,'INVALID_JSON'],[/Processing .*configuration|Invalid configuration|Unknown argument|Unknown arguments|Unexpected fields/i,'WRANGLER_CONFIG_REJECTED'],[/No entry.point|Missing entry.point/i,'ENTRYPOINT_MISSING'],[/npm error code ENOENT|npm ERR! code ENOENT/i,'NPM_LOCAL_PATH_MISSING'],[/ENOSPC|no space left/i,'LOCAL_DISK_FULL'],[/EACCES|EPERM|permission denied/i,'LOCAL_PERMISSION_DENIED'],[/ENOTFOUND|ECONNRESET|ETIMEDOUT|fetch failed/i,'SUBPROCESS_NETWORK_ERROR'],[/Unsupported engine|requires at least Node|not supported.*Node/i,'NODE_VERSION_UNSUPPORTED']];
 const rules=patterns.filter(([re])=>re.test(output)).map(([,name])=>name);
 if(error?.killed&&error?.signal==='SIGTERM')rules.push('SUBPROCESS_TIMEOUT');
 const detail=wranglerErrorDetails(error);
 if(stage==='wrangler_dry_run'&&(detail.phase!=='unclassified'||detail.issues))result.wrangler=detail;
 if(['build','unclassified'].includes(detail.phase))for(let i=rules.length-1;i>=0;i--)if(rules[i]==='WRANGLER_CONFIG_REJECTED')rules.splice(i,1);
 if(rules.length)result.rules=[...new Set(rules)];
 return result;
}
export async function runOffDryRun(profile,directory,deps={}){
 const c=await checkProfile(profile,'off');
 if(c.vars.PRODUCTION_MANAGED_CHECKOUT_ENABLED!=='0'||c.build?.command||['env','define','unsafe','secrets'].some(k=>Object.hasOwn(c,k))||Object.keys(c.vars).some(k=>/(TOKEN|SECRET|PASSWORD|API_KEY|PRIVATE_KEY)/i.test(k)))throw Error('UNSAFE_DRY_RUN_PROFILE');
 await mkdir(directory,{recursive:true,mode:0o700});
 // Wrangler normally writes debug output even with WRANGLER_LOG=error.
 // Use a private, freshly allocated .log symlink so no raw output is retained.
 const runtime=await mkdtemp(path.join(directory,'runtime-'));
 const discard=path.join(runtime,'wrangler-discard.log');await symlink('/dev/null',discard);
 const args=['--yes','wrangler@4.155.0','deploy','--dry-run','--config',profile,'--outdir',path.join(directory,'bundle')];
 try{
  await (deps.run??run)('npx',args,{env:{...process.env,WRANGLER_SEND_METRICS:'false',WRANGLER_LOG_PATH:discard,WRANGLER_LOG:'error',WRANGLER_LOG_SANITIZE:'true'},encoding:'utf8',timeout:120000,maxBuffer:8*1024*1024});
  // Successful build needs no raw bindings/config output in the diagnostic log.
  await writeFile(path.join(directory,'diagnostic.json'),JSON.stringify({stage:'wrangler_dry_run',status:'passed',exitCode:0})+'\n',{mode:0o600});
 }catch(cause){
  const diagnostic=safeReleaseDiagnostic('wrangler_dry_run',cause);diagnostic.code='WRANGLER_DRY_RUN_FAILED';
  await writeFile(path.join(directory,'diagnostic.json'),JSON.stringify(diagnostic)+'\n',{mode:0o600});
  const err=Error('WRANGLER_DRY_RUN_FAILED');err.diagnostic=diagnostic;err.directory=directory;throw err;
 }
 return {stage:'wrangler_dry_run',status:'passed',exitCode:0};
}
