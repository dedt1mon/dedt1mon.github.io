"""No third-party dependencies: verify static site/SEO/media contracts."""
import hashlib
import json
import os
import re
import sys
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
RESULTS = ROOT / 'test-results' / os.environ.get('TEST_OUTPUT', '')
RESULTS.mkdir(parents=True, exist_ok=True)
checks = []
def check(name, condition):
    checks.append({'name': name, 'status': 'PASS' if condition else 'FAIL'})

class Document(HTMLParser):
    def __init__(self, text):
        super().__init__(convert_charrefs=True)
        self.nodes = []; self.jsonld = []; self.capture = False
        self.feed(text)
    def handle_starttag(self, tag, attrs):
        d = dict(attrs); self.nodes.append((tag, d))
        self.capture = tag == 'script' and d.get('type') == 'application/ld+json'
    def handle_endtag(self, tag):
        if tag == 'script': self.capture = False
    def handle_data(self, data):
        if self.capture: self.jsonld.append(json.loads(data))

pages = {}
texts = {}
for name in ['index.html','portfolio.html','services.html','404.html']:
    texts[name] = (ROOT/name).read_text(encoding='utf-8')
    pages[name] = Document(texts[name])

def local_exists(raw):
    parsed=urlsplit(raw)
    if parsed.scheme or parsed.netloc: return parsed.scheme == 'https'
    clean=unquote(parsed.path).lstrip('/') or 'index.html'
    p=ROOT/clean
    if not p.resolve().is_relative_to(ROOT) or not p.is_file(): return False
    # Detect wrong case on Windows before Linux/GitHub Pages does.
    cursor=ROOT
    for part in Path(clean).parts:
        if part not in [x.name for x in cursor.iterdir()]: return False
        cursor /= part
    if parsed.fragment and p.suffix=='.html':
        target=pages.get(clean) or Document(p.read_text(encoding='utf-8'))
        return parsed.fragment in {d.get('id') for _,d in target.nodes}
    return True

scope = 'full'
if sys.argv[1:]:
    if sys.argv[1:] != ['--scope', 'privacy-dark']:
        raise SystemExit('Expected --scope privacy-dark or no arguments')
    scope = 'privacy-dark'

def write_report():
    report={'status':'PASS' if all(c['status']=='PASS' for c in checks) else 'FAIL','passed':sum(c['status']=='PASS' for c in checks),'failed':[c['name'] for c in checks if c['status']=='FAIL'],'source_hashes':{name:hashlib.sha256((ROOT/name).read_bytes()).hexdigest() for name in [*pages,'scripts.js','styles.css','tests/check_site.py','sitemap.xml','robots.txt']},'checks':checks,'scope':scope}
    (RESULTS/'static.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({k:report[k] for k in ['status','passed','failed']},ensure_ascii=True))
    sys.exit(report['status']!='PASS')

# The default CI path still executes every existing media/SEO/static assertion.
# Local narrow changes can check their explicit contract without replaying them.
css = (ROOT/'styles.css').read_text(encoding='utf-8')
script = (ROOT/'scripts.js').read_text(encoding='utf-8')
for name, doc in pages.items():
    text = texts[name]
    check(f'{name}:privacy link title', bool(re.search(r'<button\b[^>]*id="openPrivacy"[^>]*>Политика конфиденциальности</button>', text)))
    check(f'{name}:privacy dialog title', bool(re.search(r'<h2\b[^>]*id="privacy-title"[^>]*>Политика конфиденциальности</h2>', text)))
    check(f'{name}:privacy link targets dialog', any(d.get('id')=='openPrivacy' and d.get('aria-controls')=='privacyModal' for _,d in doc.nodes))
    check(f'{name}:obsolete privacy copy absent', 'О данных на сайте' not in text and 'Только выбранная тема' not in text)
    check(f'{name}:theme bootstrap absent', not any(t=='script' and 'theme.js' in d.get('src','') for t,d in doc.nodes))
    check(f'{name}:theme controls and classes absent', not re.search(r'theme-toggle|theme-sun|theme-moon|data-theme|Светлая тема',text))
check('theme runtime file removed', not (ROOT/'theme.js').exists())
check('light selectors and scheme detection removed', not re.search(r'data-theme|theme-toggle|theme-sun|theme-moon|prefers-color-scheme|color-scheme\s*:\s*light', css))
check('dark-only color scheme', bool(re.search(r'color-scheme\s*:\s*dark',css)))
check('theme storage and runtime removed', not re.search(r'localStorage|sessionStorage|dedtimon-theme|prefers-color-scheme|data-theme|theme-toggle',script))
check('reduced motion retained', 'prefers-reduced-motion' in css and 'prefers-reduced-motion' in script)
check('theme unused tokens removed', '--surface-raised' not in css and '--hero-shadow' not in css)
check('preview no obsolete theme route', 'theme.js' not in (ROOT/'tools/serve.cjs').read_text(encoding='utf-8'))
check('package no obsolete theme check', 'theme.js' not in (ROOT/'package.json').read_text(encoding='utf-8'))
if scope == 'privacy-dark':
    write_report()

media_refs=set()
for name,doc in pages.items():
    nodes=doc.nodes
    check(f'{name}:Russian language', any(t=='html' and d.get('lang')=='ru' for t,d in nodes))
    check(f'{name}:one visible H1', sum(t=='h1' for t,d in nodes)==1)
    ids=[d['id'] for _,d in nodes if 'id' in d]
    check(f'{name}:unique IDs',len(ids)==len(set(ids)))
    expected='https://dedt1mon.github.io/'+('' if name=='index.html' else name)
    check(f'{name}:canonical',any(t=='link' and d.get('rel')=='canonical' and d.get('href')==expected for t,d in nodes))
    check(f'{name}:description',any(t=='meta' and d.get('name')=='description' and len(d.get('content',''))>=50 for t,d in nodes))
    check(f'{name}:OG+card',all(any(t=='meta' and (d.get('property')==key or d.get('name')==key) for t,d in nodes) for key in ['og:title','og:description','og:url','og:image','twitter:card']))
    check(f'{name}:no unintended noindex',name=='404.html' or not any(d.get('name')=='robots' and 'noindex' in d.get('content','') for _,d in nodes))
    check(f'{name}:structured identity', any(any(x.get('@type')=='Person' and x.get('name')=='DedTimon' and 'Дед Тимон' in x.get('alternateName',[]) for x in data.get('@graph',[])) for data in doc.jsonld))
    check(f'{name}:brand text', 'DedTimon' in texts[name] and 'Дед Тимон' in texts[name])
    check(f'{name}:removed contacts', not re.search(r'vk\.com|kwork|вконтакте|\bVK\b',texts[name],re.I))
    check(f'{name}:copyright and manual motion UI removed','©' not in texts[name] and not re.search(r'motion-toggle|Возобновить анимации|Приостановить анимации',texts[name]))

    for i,(tag,d) in enumerate(nodes):
        if tag=='img':
            check(f'{name}:img[{i}] alt+size', 'alt' in d and int(d.get('width','0'))>0 and int(d.get('height','0'))>0)
        if d.get('target')=='_blank': check(f'{name}:external[{i}] noopener','noopener' in d.get('rel','').split())
        check(f'{name}:node[{i}] no inline handlers',not any(k.startswith('on') for k in d))
        for attr in ['src','href']:
            raw=d.get(attr,'')
            if raw and not (tag=='link' and d.get('rel')=='canonical'):
                if raw.startswith('#'): raw='/'+('' if name=='index.html' else name)+raw
                check(f'{name}:resource[{i}].{attr}:{raw}',local_exists(raw))
        if 'srcset' in d:
            for entry in d['srcset'].split(','):
                check(f'{name}:srcset[{i}]',local_exists(entry.strip().split()[0]))
        if 'data-media' in d:
            for media in json.loads(d['data-media']):
                media_refs.add(media['src'])
                check(f'{name}:media:{media["src"]}',local_exists(media['src']) and media['type'] in ['image','video'])
                check(f'{name}:preview:{media["preview"]}',local_exists(media['preview']))

cards=[d for _,d in pages['portfolio.html'].nodes if 'portfolio-card' in d.get('class','').split()]
manifest=json.loads((ROOT/'docs/content-manifest.json').read_text(encoding='utf-8'))
check('76 substantive projects retained',len(cards)==76==manifest['published_project_count'])
check('all manifest media retained',sum(len(json.loads(c['data-media'])) for c in cards)==manifest['media_count']==211)
check('visible original descriptions',all(c['data-description'] in texts['portfolio.html'].replace('&amp;','&').replace('&quot;','"') for c in cards))
check('all original media represented', {m['src'] for p in manifest['projects'] for m in p['media']}==media_refs)
check('no deleted contact icons',not any((ROOT/'img/index'/name).exists() for name in ['VK.png','Kwork.png']))
css=(ROOT/'styles.css').read_text(encoding='utf-8')
script=(ROOT/'scripts.js').read_text(encoding='utf-8')
check('scripts remain local and dependency-free',all(not d.get('src','').startswith(('http:','https:','//')) for doc in pages.values() for t,d in doc.nodes if t=='script'))
check('automatic reduced-motion support retained','prefers-reduced-motion' in css and 'prefers-reduced-motion' in script)
check('manual animation control fully removed',not re.search(r'motion-toggle|Возобновить анимации|Приостановить анимации',script))
for raw in re.findall(r'url\([\'\"]?([^\)\'\"]+)',css): check('CSS resource:'+raw,local_exists(raw))
urls=[n.text for n in ET.parse(ROOT/'sitemap.xml').getroot().iter('{http://www.sitemaps.org/schemas/sitemap/0.9}loc')]
check('sitemap exactly published content',urls==['https://dedt1mon.github.io/','https://dedt1mon.github.io/portfolio.html','https://dedt1mon.github.io/services.html'])
robots=(ROOT/'robots.txt').read_text()
check('robots allow+sitemap','Allow: /' in robots and 'Disallow: /' not in robots and 'Sitemap: https://dedt1mon.github.io/sitemap.xml' in robots)
write_report()
