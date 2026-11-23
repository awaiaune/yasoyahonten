"""Activate only reviewed UI versions; fail closed and restore our own changes on error."""
import os,json,pathlib,hashlib,urllib.request,urllib.error,argparse,re,time,datetime
p=argparse.ArgumentParser();p.add_argument('--live',required=True);p.add_argument('--candidate',required=True);p.add_argument('--out',required=True);p.add_argument('--rollback',action='store_true');a=p.parse_args()
live=pathlib.Path(a.live);candidate=pathlib.Path(a.candidate);out=pathlib.Path(a.out);out.mkdir(parents=True,exist_ok=True)
staged=json.loads((candidate/'staged-versions.json').read_text());snapshot=json.loads((live/'report.json').read_text());proof=json.loads((candidate/'patch-receipt.json').read_text())
assert staged['state']=='verified-inactive'
account=os.environ['CF_ACCOUNT_ID'];headers={'Authorization':'Bearer '+os.environ['CF_API_TOKEN'],'Content-Type':'application/json'};api='https://api.cloudflare.com/client/v4'
record=out/'deployment-receipt.json';receipt=json.loads(record.read_text()) if a.rollback and record.exists() else {'state':'preflight','timestamp':datetime.datetime.now(datetime.timezone.utc).isoformat(),'workers':staged['workers'],'changed':[],'checks':[]}
def save():record.write_text(json.dumps(receipt,indent=2))
def request(path,body=None):
 data=json.dumps(body).encode() if body is not None else None
 try:
  with urllib.request.urlopen(urllib.request.Request(api+path,headers=headers,data=data,method='POST' if body is not None else 'GET'),timeout=60) as r:j=json.load(r)
 except urllib.error.HTTPError as e:raise RuntimeError('Cloudflare API HTTP '+str(e.code)) from None
 if j.get('success') is not True:raise RuntimeError('Cloudflare API unsuccessful')
 return j['result']
def root(n):return f'/accounts/{account}/workers/scripts/{n}'
def active(n):
 d=request(root(n)+'/deployments')['deployments'];v=[i['version_id'] for i in d[0]['versions'] if i['percentage']==100]
 if len(v)!=1:raise ValueError('Expected one 100% active version')
 return v[0]
def fp(bs):return hashlib.sha256(json.dumps(sorted(bs,key=lambda b:b['name']),sort_keys=True).encode()).hexdigest()
def bindings(v):
 bs=v.get('resources',{}).get('bindings',[]);return bs.get('bindings',bs.get('items',[])) if isinstance(bs,dict) else bs

def config(s):return {k:s.get(k) for k in ['logpush','tail_consumers','observability','tags','usage_model','placement','limits','compatibility_date','compatibility_flags']}
def checkversion(n,vid):
 s=staged['workers'][n];v=request(root(n)+'/versions/'+vid)
 assert fp(bindings(v))==s['bindingFingerprint'],'Bindings changed'
 c=request(root(n)+'/settings');assert hashlib.sha256(json.dumps(config(c),sort_keys=True).encode()).hexdigest()==s['settingsFingerprint'],'Settings changed'
 return v

def deploy(n,vid):
 # An uncertain POST response is resolved by a read, never by blindly repeating a write.
 try:request(root(n)+'/deployments',{'strategy':'percentage','versions':[{'version_id':vid,'percentage':100}]})
 except Exception:
  if active(n)!=vid:raise
 if active(n)!=vid:raise ValueError('Version activation not confirmed: '+n)
 print('Active:',n,vid,flush=True)

def rollback():
 errors=[]
 for n in reversed(list(receipt['changed'])):
  s=staged['workers'][n]
  try:
   cur=active(n)
   if cur==s['candidate']:
    deploy(n,s['baseline']);receipt.setdefault('restored',[]).append(n);save()
   elif cur!=s['baseline']:raise ValueError('Another deployment exists; refusing overwrite')
  except Exception as e:errors.append(n+': '+type(e).__name__)
 receipt['state']='rollback-incomplete' if errors else 'rolled-back';receipt['rollbackErrors']=errors;save()
 if errors:raise RuntimeError('Rollback requires review: '+', '.join(errors))

origin='https://yasoyahonten.awaiaune.com'
paths=['/','/index.html','/products','/products/lemonbalm10.html','/products/yomogi10.html','/robots.txt','/sitemap.xml','/js/cart.js','/checkout.html','/css/editorial-v41-home.css','/js/admin-management.js']
def public(path):
 # Ordinary public reads, no payment or management mutation endpoints.
 req=urllib.request.Request(origin+path,headers={'User-Agent':'YASOYA-UI-Release-Check/20261123','Cache-Control':'no-cache'})
 with urllib.request.urlopen(req,timeout=40) as r:
  body=r.read();assert r.status==200
  return {'body':body,'status':r.status,'url':r.url,'release':r.headers.get('X-Yasoya-UI-Release'),'csp':r.headers.get('Content-Security-Policy')}
def capture(label):
 d={};folder=out/label;folder.mkdir(exist_ok=True)
 for path in paths:
  r=public(path);d[path]=r;(folder/('index.html' if path=='/' else path[1:].replace('/','__'))).write_bytes(r['body'])
 receipt[label]={k:{x:v[x] for x in ['status','url','release','csp']}|{'sha256':hashlib.sha256(v['body']).hexdigest()} for k,v in d.items()};save();return d

def purchase(s):
 i=s.index('class="v30-purchase"');j=s.index('class="v30-below"');assert j-i>100;return s[i:j]
def title(s):return re.search(r'<title>(.*?)</title>',s,re.S).group(1)
def canonical(s):
 from html.parser import HTMLParser
 class H(HTMLParser):
  links=[]
  def handle_starttag(self,tag,attrs):
   d=dict(attrs)
   if tag=='link' and d.get('rel')=='canonical':self.links.append(d.get('href'))
 h=H();h.links=[];h.feed(s);return h.links

def smoke(before,after):
 desc='八草屋本店は、自然乾燥のハーブティーを届けるオンラインショップです。レモンバームティーやよもぎ茶など、植物それぞれの香りと個性を、一杯のお茶で楽しめます。'
 for path in ['/','/index.html']:
  b=before[path]['body'].decode();s=after[path]['body'].decode()
  assert 'class="shop-description"' not in s and desc not in s.split('<body')[1]
  assert '<meta name="description" content="'+desc+'">' in s
  assert s.count('class="v19-center-name"')==2
  assert title(s)==title(b) and canonical(s)==canonical(b)
  assert before[path]['csp']==after[path]['csp']
 for path in ['/products','/products/lemonbalm10.html','/products/yomogi10.html','/robots.txt','/sitemap.xml','/js/cart.js','/checkout.html','/js/admin-management.js']:
  assert before[path]['body']==after[path]['body'],'Unexpected changed resource: '+path
 assert after['/css/editorial-v41-home.css']['release']=='20261123'
 css=after['/css/editorial-v41-home.css']['body'].decode()
 assert 'bottom:58px' in css and 'text-align:left' in css
 receipt['checks']=['home and index.html have SEO description in metadata only','plant names still generated from published p2.name','title/canonical/CSP preserved','shop/product pages/robots/sitemap/cart/checkout/admin JS byte-identical','updated name layout CSS present'];save()

if a.rollback:
 if not record.exists():raise ValueError('No activation receipt; refusing untracked rollback')
 rollback();print('Rollback complete');raise SystemExit()
try:
 assert set(staged['workers'])==set(snapshot['workers'])
 for n,s in staged['workers'].items():
  assert s.get('verified') and s['baseline']==snapshot['workers'][n]['version'];assert active(n)==s['baseline'],'Active baseline changed'
  listing=request(root(n)+'/versions?per_page=1');items=listing.get('items',listing.get('versions',[])) if isinstance(listing,dict) else listing;assert items[0]['id']==s['candidate'],'Another upload exists'
  checkversion(n,s['baseline']);checkversion(n,s['candidate'])
  for part in s['parts']:assert hashlib.sha256((candidate/n/part['name']).read_bytes()).hexdigest()==part['sha256']
 before=capture('before');save()
 # No data/schema/secret/settings changes. Both candidates were verified independently first.
 for n in staged['workers']:
  s=staged['workers'][n];assert active(n)==s['baseline'],'Concurrent deployment detected'
  receipt['changed'].append(n);save();deploy(n,s['candidate']);checkversion(n,s['candidate'])
 receipt['state']='activated-pending-smoke';save()
 last=None
 for attempt in range(4):
  try:after=capture('after');smoke(before,after);last=None;break
  except Exception as e:last=e;time.sleep(3)
 if last:raise last
 for n,s in staged['workers'].items():assert active(n)==s['candidate'];checkversion(n,s['candidate'])
 receipt['state']='production-smoke-passed';save();print('PASS home polish smoke checks; all assets/bindings/settings retained',flush=True)
except Exception as e:
 receipt['failure']=type(e).__name__+': '+str(e);save();print('STOP:',receipt['failure'],flush=True)
 if receipt['changed']:rollback()
 raise
