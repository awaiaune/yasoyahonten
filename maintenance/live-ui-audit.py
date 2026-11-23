import os,json,re,hashlib,pathlib,urllib.request,urllib.error,concurrent.futures
from email import policy
from email.parser import BytesParser
from urllib.parse import urljoin,urlparse,unquote
OUT=pathlib.Path(os.environ['RUNNER_TEMP'])/'yasoya-live-ui-audit';OUT.mkdir()
API='https://api.cloudflare.com/client/v4';ACCOUNT=os.environ['CF_ACCOUNT_ID'];TOKEN=os.environ['CF_API_TOKEN']
def raw(url,auth=False):
 h={'User-Agent':'YasoyaReadOnlyAudit/1.0'}
 if auth:h['Authorization']='Bearer '+TOKEN
 with urllib.request.urlopen(urllib.request.Request(url,headers=h,method='GET'),timeout=40) as r:
  data=r.read(6000000)
  if len(data)>=6000000:raise ValueError('response limit')
  return data,r.headers.get('Content-Type',''),r.status

def get(path):
 data,_,_=raw(API+path,True);j=json.loads(data)
 if j.get('success') is not True:raise ValueError('Cloudflare unsuccessful')
 return j['result']
def live(name):
 d=get(f'/accounts/{ACCOUNT}/workers/scripts/{name}/deployments')['deployments']
 entries=[x['version_id'] for x in d[0]['versions'] if x['percentage']==100]
 if len(entries)!=1:raise ValueError('not one 100 percent version')
 return entries[0]
def bindings(v):
 b=v.get('resources',{}).get('bindings',[])
 return b.get('bindings',b.get('items',[])) if isinstance(b,dict) else b
report={'workers':{},'public':{},'optional':{}}
for name in ['yasoya-honten-payments','yasoya-honten-admin']:
 prefix=f'/accounts/{ACCOUNT}/workers/scripts/{name}'
 try:
  vid=live(name);v=get(prefix+'/versions/'+vid);s=get(prefix+'/settings');data,ctype,_=raw(API+prefix+'/content/v2',True)
  parsed=BytesParser(policy=policy.default).parsebytes(b'MIME-Version: 1.0\r\nContent-Type: '+ctype.encode()+b'\r\n\r\n'+data)
  if not parsed.is_multipart():raise ValueError('unexpected source MIME')
  folder=OUT/name;folder.mkdir();parts=[];main=None
  for p in parsed.iter_parts():
   n=p.get_param('name',header='content-disposition');blob=p.get_payload(decode=True)
   if n=='metadata':main=json.loads(blob).get('main_module');continue
   if not n or not isinstance(blob,bytes) or n.startswith('/') or '..' in pathlib.PurePosixPath(n).parts:raise ValueError('unsafe module name')
   path=folder/n;path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(blob)
   parts.append({'name':n,'filename':p.get_filename() or n,'type':p.get_content_type(),'size':len(blob),'sha256':hashlib.sha256(blob).hexdigest()})
  bs=bindings(v)
  if live(name)!=vid:raise ValueError('version changed during read')
  report['workers'][name]={'version':vid,'main_module':main or (parts[0]['name'] if len(parts)==1 else None),'parts':parts,'bindings':[{'name':b['name'],'type':b['type']} for b in bs],'bindingFingerprint':hashlib.sha256(json.dumps(sorted(bs,key=lambda b:b['name']),sort_keys=True).encode()).hexdigest(),'compatibility_date':s.get('compatibility_date'),'compatibility_flags':s.get('compatibility_flags'),'assets':s.get('assets'),'settingsKeys':sorted(s.keys()),'exports':v.get('resources',{}).get('script_runtime',{}).get('exports')}
  for k in ['PRODUCTION_CHECKOUT_ENABLED','PRODUCTION_MANAGED_CHECKOUT_ENABLED','SITE_URL','PRODUCTION_ADMIN_ORIGIN']:
   b=next((x for x in bs if x['name']==k),None)
   if b:report['workers'][name][k]=b.get('text')
 except urllib.error.HTTPError as e:report['workers'][name]={'errorHTTP':e.code}

base='https://yasoyahonten.awaiaune.com'
paths=['/','/products.html','/products/lemonbalm.html','/products/yomogi.html','/robots.txt','/sitemap.xml','/js/admin-management.js','/js/admin-ui.js','/js/admin.js','/css/admin.css']
seen=set()
def public(path):
 try:
  data,ctype,status=raw(base+path);f=OUT/'public'/('index.html' if path=='/' else path.lstrip('/'));f.parent.mkdir(parents=True,exist_ok=True);f.write_bytes(data)
  return path,{'status':status,'type':ctype,'size':len(data),'sha256':hashlib.sha256(data).hexdigest()},data
 except urllib.error.HTTPError as e:return path,{'status':e.code},b''
 except Exception as e:return path,{'error':type(e).__name__},b''
for depth in range(2):
 todo=[p for p in paths if p not in seen][:180];seen.update(todo);paths=[]
 with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
  for path,meta,data in pool.map(public,todo):
   report['public'][path]=meta
   if meta.get('status')==200 and ('html' in meta.get('type','')):
    for ref in re.findall(r'(?:src|href)=["\x27]([^"\x27]+)',data.decode('utf8','replace')):
     u=urlparse(urljoin(base+path,ref));p=unquote(u.path)
     if u.netloc==urlparse(base).netloc and re.fullmatch(r'/(?:js|css|images)/[A-Za-z0-9_./-]+\.(?:js|css|jpg|jpeg|png|webp|svg|ico)',p) and '..' not in pathlib.PurePosixPath(p).parts:paths.append(p)
for label,path in [('domains',f'/accounts/{ACCOUNT}/workers/domains'),('scripts',f'/accounts/{ACCOUNT}/workers/scripts')]:
 try:
  r=get(path)
  if label=='domains':report['optional'][label]=[{k:x[k] for k in ['hostname','service','environment'] if k in x} for x in r if 'yasoya' in str(x) or 'awaiaune' in str(x)]
  else:report['optional'][label]=[{'id':x.get('id'),'tag':x.get('tag')} for x in r if 'yasoya' in x.get('id','')]
 except urllib.error.HTTPError as e:report['optional'][label]={'errorHTTP':e.code}
(OUT/'report.json').write_text(json.dumps(report,indent=2,ensure_ascii=False))
print('READ-ONLY audit complete. No deployments, uploads, DB reads or configuration changes.')
print(json.dumps({'workers':{k:{x:v[x] for x in ['version','main_module','parts','errorHTTP'] if x in v} for k,v in report['workers'].items()},'public':report['public'],'optional':report['optional']},ensure_ascii=False))
