#!/usr/bin/env bash
# STEP 1 only: authenticated read-only identity check, export, isolated restore.
# No deploy, migrations, remote import, DELETE/UPDATE/INSERT or Square calls.
set +x
set -euo pipefail
umask 077
command -v npx >/dev/null || { echo 'Node.js / npx が必要です。'; exit 1; }
command -v python3 >/dev/null || { echo 'Python 3 と SQLite が必要です。'; exit 1; }
backup_root="${YASOYA_BACKUP_ROOT:-$HOME/.local/state/yasoya-production-backups}"
mkdir -p "$backup_root"
backup_dir="$backup_root/$(date -u +%Y%m%dT%H%M%SZ)"
mkdir "$backup_dir"
chmod 700 "$backup_root" "$backup_dir"
if git -C "$backup_dir" rev-parse --show-toplevel >/dev/null 2>&1; then
 echo 'Git管理下には保存しません。YASOYA_BACKUP_ROOTを変更してください。'; exit 1
fi
python3 - "$backup_dir" <<'PY'
import os,sys,json,sqlite3,hashlib,subprocess,re
from pathlib import Path
from datetime import datetime,timezone
root=Path(sys.argv[1]);os.umask(0o077)
name='yasoya-orders';dbid='442fa9fd-25d3-4c01-bcc3-04be7b420cf5'
config={'name':'yasoya-production-backup-readonly','compatibility_date':'2026-08-04','d1_databases':[{'binding':'ORDERS_DB','database_name':name,'database_id':dbid}]}
account=os.environ.get('CLOUDFLARE_ACCOUNT_ID')
if account:
 if not re.fullmatch('[0-9a-fA-F]{32}',account):raise SystemExit('Account ID形式が不正です。')
 config['account_id']=account
cfg=root/'backup-readonly.jsonc';cfg.write_text(json.dumps(config));cfg.chmod(0o600)
# Discard persistent CLI debug logs, including query results and signed URLs.
log=root/'discard.log';log.symlink_to('/dev/null')
env=os.environ.copy();env.update({'WRANGLER_SEND_METRICS':'false','WRANGLER_LOG_PATH':str(log),'WRANGLER_LOG_SANITIZE':'true','NO_COLOR':'1','CI':'1'})
state={'databaseName':name,'databaseId':dbid,'status':'not-exported','stage':'authenticate-and-identify','scope':'all application tables; excludes DO/R2/Square/Secrets/Cloudflare-managed internal tables'}
def invoke(args,as_json=True,timeout=120):
 p=subprocess.run(['npx','--yes','wrangler@4.155.0',*args,'--config',str(cfg)],env=env,capture_output=True,text=True,timeout=timeout)
 if p.returncode:
  codes=sorted(set(re.findall(r'\[code:\s*(\d+)\]',p.stdout+'\n'+p.stderr)))
  raise RuntimeError('公式CLI失敗: exit='+str(p.returncode)+' codes='+','.join(codes)+'。生出力は保存していません。')
 if not as_json:return None
 return json.loads(p.stdout)
def query(sql):
 # Internal caller constructs only SELECT and PRAGMA table_info statements.
 if not (sql.startswith('SELECT ') or sql.startswith('PRAGMA table_info(')):raise RuntimeError('読取SQL以外は実行しません。')
 result=invoke(['d1','execute',name,'--remote','--json','--command',sql])
 if not isinstance(result,list) or len(result)!=1 or result[0].get('success') is not True:raise RuntimeError('読取結果を検証できません。')
 return result[0].get('results',[])
quote=lambda s:'"'+s.replace('"','""')+'"'
def table_names():return [r['name'] for r in query("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT GLOB '_cf_*' ORDER BY name")]
def source_counts(names):
 if not names:return {}
 sql=' UNION ALL '.join('SELECT '+"'"+n.replace("'","''")+"' AS table_name,COUNT(*) AS n FROM "+quote(n) for n in names)
 return {r['table_name']:r['n'] for r in query(sql)}
def fingerprint(rows):return hashlib.sha256(json.dumps(sorted(rows,key=lambda r:json.dumps(r,sort_keys=True)),ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()).hexdigest()
identity_columns={'orders':['order_reference','payment_id','items_json'],'mg_products':['id','slug'],'mg_variants':['id','product_id'],'mg_mappings':['variant_id','item_id','variation_id','sku']}
conn=None
try:
 databases=invoke(['d1','list','--json'])
 matches=[d for d in databases if d.get('name')==name and (d.get('uuid') or d.get('id'))==dbid]
 if len(matches)!=1:raise RuntimeError('指定アカウント内で本番D1の名前とIDが一致しません。exportを実行しません。')
 state['productionDatabaseConfirmed']=True;state['stage']='source-readonly-snapshot'
 names=table_names()
 if 'orders' not in names:raise RuntimeError('ordersがないため本番DBとして承認できません。')
 before=source_counts(names);columns={n:query('PRAGMA table_info('+quote(n)+')') for n in names}
 identities={};selected={}
 for n,wanted in identity_columns.items():
  if n not in names:continue
  available={r['name'] for r in columns[n]};selected[n]=[c for c in wanted if c in available]
  if n=='orders' and selected[n]!=wanted:raise RuntimeError('注文参照列が想定と異なります。')
  if selected[n]:identities[n]=fingerprint(query('SELECT '+','.join(map(quote,selected[n]))+' FROM '+quote(n)))
 state['stage']='official-remote-export';dump=root/'yasoya-orders.sql'
 invoke(['d1','export',name,'--remote','--output',str(dump)],as_json=False,timeout=600)
 if not dump.is_file() or dump.stat().st_size==0:raise RuntimeError('SQLエクスポートが空です。')
 dump.chmod(0o600);state['status']='exported-not-yet-verified';state['stage']='isolated-local-restore'
 restored=root/'restore-verification.sqlite'
 if restored.exists():raise RuntimeError('既存の復元DBには上書きしません。')
 conn=sqlite3.connect(restored);conn.row_factory=sqlite3.Row
 conn.executescript(dump.read_text(encoding='utf-8'));restored.chmod(0o600)
 integrity=[r[0] for r in conn.execute('PRAGMA integrity_check')]
 foreign_key_errors=sum(1 for _ in conn.execute('PRAGMA foreign_key_check'))
 local_names=[r[0] for r in conn.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT GLOB '_cf_*' ORDER BY name")]
 local_counts={n:conn.execute('SELECT COUNT(*) FROM '+quote(n)).fetchone()[0] for n in local_names}
 local_identities={n:fingerprint([dict(r) for r in conn.execute('SELECT '+','.join(map(quote,selected[n]))+' FROM '+quote(n))]) for n in identities}
 state['stage']='source-after-export-readonly-comparison'
 after_names=table_names();after=source_counts(after_names)
 after_identities={n:fingerprint(query('SELECT '+','.join(map(quote,selected[n]))+' FROM '+quote(n))) for n in identities if n in after_names}
 state.update({'sourceStableDuringExport':before==after and names==after_names and identities==after_identities,'allTableCountsMatch':before==after==local_counts,'tableNamesMatch':names==local_names,'orderReferencesMatch':identities.get('orders')==local_identities.get('orders')==after_identities.get('orders'),'productIdentityTablesMatched':{n:identities[n]==local_identities[n]==after_identities.get(n) for n in identities if n!='orders'},'identityTablesChecked':list(identities),'sqliteIntegrity':'ok' if integrity==['ok'] else 'failed','foreignKeyErrorCount':foreign_key_errors,'tableCounts':local_counts,'columns':{n:[{'name':c['name'],'type':c['type'],'primaryKeyPosition':c['pk']} for c in columns[n]] for n in names},'exportBytes':dump.stat().st_size,'exportSha256':hashlib.sha256(dump.read_bytes()).hexdigest(),'verifiedAtUTC':datetime.now(timezone.utc).isoformat(),'backupFile':str(dump),'localRestoreFile':str(restored),'permissions':'directory=0700; SQL/SQLite/verification=0600'})
 ok=state['sourceStableDuringExport'] and state['allTableCountsMatch'] and state['tableNamesMatch'] and state['orderReferencesMatch'] and all(state['productIdentityTablesMatched'].values()) and integrity==['ok'] and not foreign_key_errors
 state['status']='verified' if ok else 'exported-comparison-needs-review';state['stage']='complete'
except Exception as error:
 # Never print raw exceptions from CLI/SQLite: they can contain SQL/data/URLs.
 state['errorClass']=type(error).__name__;state['status']=state['status']+'-failed'
 if isinstance(error,RuntimeError) and str(error).startswith(('公式CLI失敗','指定アカウント内','ordersがない','注文参照列','SQLエクスポートが空')):state['safeReason']=str(error)
finally:
 if conn:conn.close()
 manifest=root/'backup-verification.json';manifest.write_text(json.dumps(state,ensure_ascii=False,indent=2));manifest.chmod(0o600)
 print(json.dumps({'status':state['status'],'stage':state['stage'],'verificationFile':str(manifest),'backupFile':state.get('backupFile'),'allTableCountsMatch':state.get('allTableCountsMatch'),'sqliteIntegrity':state.get('sqliteIntegrity'),'safeReason':state.get('safeReason')},ensure_ascii=False))
if state['status']!='verified':raise SystemExit(1)
PY
printf 'SQL/SQLiteは顧客情報を含みます。GitHub・チャットへ共有せず安全に保管してください。\n'
printf '共有対象は backup-verification.json のみです。\n'
