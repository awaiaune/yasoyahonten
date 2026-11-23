import os,json,pathlib,hashlib,urllib.request,urllib.error,uuid,re,argparse
p=argparse.ArgumentParser();p.add_argument('--live',required=True);p.add_argument('--candidate',required=True);a=p.parse_args();live=pathlib.Path(a.live);candidate=pathlib.Path(a.candidate)
snapshot=json.loads((live/'report.json').read_text());proof=json.loads((candidate/'patch-receipt.json').read_text())
account=os.environ['CF_ACCOUNT_ID'];auth={'Authorization':'Bearer '+os.environ['CF_API_TOKEN']};api='https://api.cloudflare.com/client/v4';out=candidate/'staged-versions.json';receipt={'state':'preflight','workers':{}}
def save():out.write_text(json.dumps(receipt,indent=2))
def get(path):
 with urllib.request.urlopen(urllib.request.Request(api+path,headers={**auth,'Accept':'application/json'},method='GET'),timeout=40) as r:j=json.load(r)
 if j.get('success') is not True:raise ValueError('Cloudflare read unsuccessful')
 return j['result']
def base(n):return f'/accounts/{account}/workers/scripts/{n}'
def active(n):
 d=get(base(n)+'/deployments')['deployments'];v=[i['version_id'] for i in d[0]['versions'] if i['percentage']==100]
 if len(v)!=1:raise ValueError('Expected one active version')
 return v[0]
def bindings(v):
 b=v.get('resources',{}).get('bindings',[]);return b.get('bindings',b.get('items',[])) if isinstance(b,dict) else b

def fingerprint(bs):return hashlib.sha256(json.dumps(sorted(bs,key=lambda b:b['name']),sort_keys=True).encode()).hexdigest()
def settings(s):return {k:s.get(k) for k in ['logpush','tail_consumers','observability','tags','usage_model','placement','limits','compatibility_date','compatibility_flags']}
def equivalent(old,new):
 if fingerprint(bindings(old))!=fingerprint(bindings(new)):raise ValueError('Inherited bindings differ')
 for path,fields in [('script_runtime',['compatibility_date','compatibility_flags','exports','migration_tag']),('script',['handlers','named_handlers'])]:
  l=old.get('resources',{}).get(path,{}) or {};r=new.get('resources',{}).get(path,{}) or {}
  for k in fields:
   if l.get(k)!=r.get(k):raise ValueError('Runtime/exports mismatch: '+path+'.'+k)
for name,expected in snapshot['workers'].items():
 if active(name)!=expected['version']:raise ValueError('Active baseline changed: '+name)
for name,expected in snapshot['workers'].items():
 baseline=expected['version'];root=base(name);old=get(root+'/versions/'+baseline);config=get(root+'/settings');bs=bindings(old)
 if fingerprint(bs)!=expected['bindingFingerprint']:raise ValueError('Baseline bindings changed')
 listing=get(root+'/versions?per_page=1');items=listing.get('items',listing.get('versions',[])) if isinstance(listing,dict) else listing
 if not items or items[0]['id']!=baseline:raise ValueError('Unreviewed latest upload exists for '+name)
 if len(bs)!=len(expected['bindings']):raise ValueError('Unexpected bindings')
 for part in proof['workers'][name]['afterParts']:
  if hashlib.sha256((candidate/name/part['name']).read_bytes()).hexdigest()!=part['sha256']:raise ValueError('Candidate source changed')
 js=[x for x in expected['parts'] if 'javascript' in x['type']];main=expected.get('main_module') or (js[0]['name'] if len(js)==1 else None)
 if not main:raise ValueError('Entrypoint unknown')
 metadata={'main_module':main,'keep_assets':True,'bindings':[{'type':'inherit','name':b['name']} for b in bs],'compatibility_date':config['compatibility_date'],'compatibility_flags':config.get('compatibility_flags',[]),'annotations':{'workers/message':'INACTIVE YASOYA UI 20261123. Exact live-source patch. Original assets and every binding inherited.'}}
 # Script-level settings are left untouched by the version endpoint.
 boundary='----yasoya-ui-'+uuid.uuid4().hex;body=bytearray()
 def append(n,data,t,filename=None):
  h='Content-Disposition: form-data; name="'+n+'"'+('; filename="'+filename+'"' if filename else '')
  body.extend(('--'+boundary+'\r\n'+h+'\r\nContent-Type: '+t+'\r\n\r\n').encode());body.extend(data);body.extend(b'\r\n')
 append('metadata',json.dumps(metadata).encode(),'application/json')
 for part in expected['parts']:append(part['name'],(candidate/name/part['name']).read_bytes(),part['type'],part['filename'])
 body.extend(('--'+boundary+'--\r\n').encode())
 if active(name)!=baseline:raise ValueError('Live changed before upload')
 req=urllib.request.Request(api+root+'/versions?bindings_inherit=strict',headers={**auth,'Content-Type':'multipart/form-data; boundary='+boundary},method='POST',data=bytes(body))
 try:
  with urllib.request.urlopen(req,timeout=90) as r:result=json.load(r)
 except urllib.error.HTTPError as e:raise RuntimeError('Inactive version upload rejected HTTP '+str(e.code)) from None
 if result.get('success') is not True:raise ValueError('Inactive upload unsuccessful')
 vid=result.get('result',{}).get('id')
 if not isinstance(vid,str) or not re.fullmatch(r'[a-f0-9-]{36}',vid) or vid==baseline:raise ValueError('Invalid candidate version ID')
 receipt['workers'][name]={'baseline':baseline,'candidate':vid,'bindingFingerprint':expected['bindingFingerprint'],'settingsFingerprint':hashlib.sha256(json.dumps(settings(config),sort_keys=True).encode()).hexdigest(),'parts':proof['workers'][name]['afterParts']};save()
 equivalent(old,get(root+'/versions/'+vid))
 if settings(config)!=settings(get(root+'/settings')):raise ValueError('Script settings changed')
 if active(name)!=baseline:raise ValueError('Live deployment changed unexpectedly')
 receipt['workers'][name]['verified']=True;save();print('PASS inactive candidate:',name,vid,'bindings',len(bs),'live baseline retained',baseline)
receipt['state']='verified-inactive';save()
print('SUCCESS: both inactive versions verified. No deployment, routes, settings, Secrets, DB, Square or DO migrations changed.')
