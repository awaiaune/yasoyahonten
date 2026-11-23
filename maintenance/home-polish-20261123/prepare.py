import pathlib,json,hashlib,argparse,re,subprocess,shutil,os,urllib.request,email.parser,email.policy
p=argparse.ArgumentParser();p.add_argument('--assets',required=True);p.add_argument('--out',required=True);p.add_argument('--check-cloud',action='store_true');a=p.parse_args()
base=pathlib.Path('maintenance/ui-release-record-20261123');assets=pathlib.Path(a.assets);out=pathlib.Path(a.out);out.mkdir(parents=True,exist_ok=True)
record=json.loads((base/'production-receipt.json').read_text());name='yasoya-honten-payments';baseline=record['production']['workers'][name]['candidate'];proof=record['sourceProof'];source=(base/'deployed/storefront-worker.js').read_text();parts=proof['workers'][name]['afterParts']
assert hashlib.sha256(source.encode()).hexdigest()==parts[0]['sha256']
if a.check_cloud:
 account=os.environ['CF_ACCOUNT_ID'];root=f'https://api.cloudflare.com/client/v4/accounts/{account}/workers/scripts/{name}';headers={'Authorization':'Bearer '+os.environ['CF_API_TOKEN']}
 def get(path):
  with urllib.request.urlopen(urllib.request.Request(root+path,headers=headers),timeout=40) as r:j=json.load(r)
  assert j['success'];return j['result']
 d=get('/deployments')['deployments'][0]['versions'];assert d==[{'version_id':baseline,'percentage':100}] or len(d)==1 and d[0]['version_id']==baseline and d[0]['percentage']==100
 listing=get('/versions?per_page=1');assert listing['items'][0]['id']==baseline,'Unreviewed latest upload'
 with urllib.request.urlopen(urllib.request.Request(root+'/content/v2',headers=headers),timeout=40) as r:data=r.read();ctype=r.headers['content-type']
 msg=email.parser.BytesParser(policy=email.policy.default).parsebytes(('Content-Type: '+ctype+'\r\nMIME-Version: 1.0\r\n\r\n').encode()+data)
 assert msg.is_multipart();downloaded={part.get_param('name',header='content-disposition'):part.get_payload(decode=True) for part in msg.iter_parts()};assert downloaded['storefront-worker.js']==source.encode(),'Live source differs from checkpoint'
 print('PASS current active source matches the deployed GitHub checkpoint')
changes=[]
def replace(old,new,label):
 global source
 assert source.count(old)==1,label;source=source.replace(old,new);changes.append(label)
line=next(x for x in source.splitlines(True) if x.startswith('  if (home) r = r.on(".v20-link-inner > div"'))
replace(line,'','remove visible botanical shop paragraph')
description='八草屋本店は、自然乾燥のハーブティーを届けるオンラインショップです。レモンバームティーやよもぎ茶など、植物それぞれの香りと個性を、一杯のお茶で楽しめます。'
line=next(x for x in source.splitlines() if 'const description = home ?' in x)
replace(line,'  const description = home ? '+json.dumps(description,ensure_ascii=True)+' : '+line.rsplit(' : ',1)[1],'keep description in existing home meta/OG/Twitter/JSON-LD')
match=re.search(r'^const YASOYA_UI_20261123=(.+);$',source,re.M);spec=json.loads(match.group(1));oldspec=json.loads(match.group(1));css=spec['/css/editorial-v41-home.css']['body']
old=next(x for x in css.splitlines() if x.startswith('#botanicalTrack .v19-center-name{'))
new='#botanicalTrack .v19-center-name{position:absolute;top:auto;right:clamp(26px,8vw,140px);bottom:58px;left:clamp(26px,8vw,140px);width:auto;margin:0;transform:none;z-index:2;pointer-events:none;color:#fff;text-align:left;font:400 clamp(11px,1vw,13px)/1.65 Arial,sans-serif;letter-spacing:.20em;text-shadow:0 1px 3px rgba(0,0,0,.35);overflow-wrap:anywhere}'
css=css.replace(old,new)
css='\n'.join(x for x in css.splitlines() if not x.startswith('.v20-link .shop-description'))+'\n@media(max-width:600px){#botanicalTrack .v19-center-name{bottom:61px}}\n'
spec['/css/editorial-v41-home.css']['body']=css
assert spec['/js/admin-management.js']==oldspec['/js/admin-management.js']
replace(match.group(0),'const YASOYA_UI_20261123='+json.dumps(spec,ensure_ascii=True)+';','move and resize name beside swipe progress; keep all other asset overrides')
original=(base/'deployed/storefront-worker.js').read_text()
def sections(s):
 ms=list(re.finditer(r'^// ([^\n]+\.js)\n',s,re.M));return {m.group(1):s[m.end():ms[i+1].start() if i+1<len(ms) else len(s)] for i,m in enumerate(ms)}
before,after=sections(original),sections(source);allowed={'worker/src/management/seo.js','worker/src/management/v53-render.js'}
# The existing presentation overlay is embedded at the end of v53-render's compiled section.
for key,value in before.items():
 if key not in allowed:assert after.get(key)==value,'Protected section changed: '+key
assert '${escape(p2.name)}</h2>' in source
(out/name).mkdir(exist_ok=True);(out/name/'storefront-worker.js').write_text(source)
(out/'public/css').mkdir(parents=True,exist_ok=True);(out/'public/js').mkdir(parents=True,exist_ok=True)
(out/'public/css/editorial-v41-home.css').write_text(css);(out/'public/js/admin-management.js').write_text(spec['/js/admin-management.js']['body'])
current=record['production']['workers'][name]
report=json.loads((assets/'report.json').read_text());report['workers']={name:{**report['workers'][name],'version':baseline,'parts':parts}}
(out/'live').mkdir(exist_ok=True);(out/'live/report.json').write_text(json.dumps(report))
receipt={'workers':{name:{'baseline':baseline,'beforeParts':parts,'afterParts':[{**parts[0],'size':len(source.encode()),'sha256':hashlib.sha256(source.encode()).hexdigest()}]}},'changes':changes,'unchangedSourceSections':sorted(set(before)-allowed),'protectedSectionsVerified':len(set(before)-allowed),'description':description}
(out/'patch-receipt.json').write_text(json.dumps(receipt,indent=2))
subprocess.run(['node','--input-type=module','--check'],input=source.encode(),check=True)
print('PASS three exact presentation edits;',receipt['protectedSectionsVerified'],'other source sections identical; no admin change')
