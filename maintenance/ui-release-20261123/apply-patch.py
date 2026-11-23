import pathlib,json,hashlib,argparse,subprocess
p=argparse.ArgumentParser();p.add_argument('--live',required=True);p.add_argument('--out',required=True);p.add_argument('--plan',required=True);a=p.parse_args()
live=pathlib.Path(a.live);out=pathlib.Path(a.out);plan=json.loads(pathlib.Path(a.plan).read_text());out.mkdir(parents=True,exist_ok=True)
report=json.loads((live/'report.json').read_text());receipt={'workers':{},'patches':{}}
for name,expected in plan['baseline'].items():
 got=report['workers'].get(name,{})
 if got.get('version')!=expected['version']:raise ValueError('Unexpected version '+name)
 for part in expected['parts']:
  path=live/name/part['name']
  if hashlib.sha256(path.read_bytes()).hexdigest()!=part['sha256']:raise ValueError('Source hash mismatch')
  dest=out/name/part['name'];dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(path.read_bytes())
 receipt['workers'][name]={'baseline':got['version'],'beforeParts':got['parts'],'afterParts':[]}
for target,changes in plan['patches'].items():
 original=(live/target).read_text();changed=original
 for patch in changes:
  if changed.count(patch['before'])!=1:raise ValueError('Non-unique patch: '+patch['label'])
  changed=changed.replace(patch['before'],patch['after'])
 dest=out/target;dest.parent.mkdir(parents=True,exist_ok=True);dest.write_text(changed)
 receipt['patches'][target]=[p['label'] for p in changes]
css=live/'public/css/editorial-v41-home.css'
if css.read_text()!=plan['css']['before']:raise ValueError('CSS baseline mismatch')
(out/'public/css').mkdir(parents=True,exist_ok=True);(out/'public/css/editorial-v41-home.css').write_text(plan['css']['after'])
for name,entry in receipt['workers'].items():
 for part in entry['beforeParts']:
  path=out/name/part['name']
  entry['afterParts'].append({**part,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'size':path.stat().st_size})
  if 'javascript' in part['type']:subprocess.run(['node','--input-type=module','--check'],input=path.read_bytes(),check=True,capture_output=True)
# Shipping, payment, API and DO source sections remain byte-identical.
source='yasoya-honten-payments/storefront-worker.js';old=(live/source).read_text();new=(out/source).read_text()
import re
allowed={'worker/src/management/presentation-images.js','worker/src/management/storefront.js','worker/src/management/seo.js','worker/src/management/v53-render.js','production/storefront-worker.js'}
def sections(text):
 matches=list(re.finditer(r'^// ([^\n]+\.js)\n',text,re.M));return {m.group(1):text[m.end():matches[i+1].start() if i+1<len(matches) else len(text)] for i,m in enumerate(matches)}
o,n=sections(old),sections(new)
for key,value in o.items():
 if key not in allowed and n.get(key)!=value:raise ValueError('Protected section changed: '+key)
receipt['unchangedSourceSections']=sorted(set(o)-allowed)
receipt['protectedSectionsVerified']=len(receipt['unchangedSourceSections'])
(out/'patch-receipt.json').write_text(json.dumps(receipt,indent=2))
print('PASS exact source/asset patch hashes and',receipt['protectedSectionsVerified'],'unchanged source sections. No deployment.')
