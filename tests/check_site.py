"""No third-party dependencies: verify static site/SEO/media contracts."""
import hashlib
from datetime import datetime
from html import unescape
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
    if len(sys.argv) != 3 or sys.argv[1] != '--scope' or sys.argv[2] not in ['privacy-dark', 'content', 'catalog', 'close-title', 'carousel']:
        raise SystemExit('Expected --scope privacy-dark, --scope content, --scope catalog, --scope close-title, --scope carousel, or no arguments')
    scope = sys.argv[2]

def write_report():
    report={'status':'PASS' if all(c['status']=='PASS' for c in checks) else 'FAIL','passed':sum(c['status']=='PASS' for c in checks),'failed':[c['name'] for c in checks if c['status']=='FAIL'],'source_hashes':{name:hashlib.sha256((ROOT/name).read_bytes()).hexdigest() for name in [*pages,'scripts.js','styles.css','tests/check_site.py','docs/content-manifest.json','sitemap.xml','robots.txt']},'checks':checks,'scope':scope}
    (RESULTS/'static.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({k:report[k] for k in ['status','passed','failed']},ensure_ascii=True))
    sys.exit(report['status']!='PASS')

# The default CI path still executes every existing media/SEO/static assertion.
# Local narrow changes can check their explicit contract without replaying them.
css = (ROOT/'styles.css').read_text(encoding='utf-8')
script = (ROOT/'scripts.js').read_text(encoding='utf-8')
if scope not in ['content', 'catalog', 'close-title', 'carousel']:
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

# Content-only contract; the default CI path also includes these assertions.
class ContentDocument(HTMLParser):
    def __init__(self, text):
        super().__init__(convert_charrefs=True)
        self.stack=[]; self.cards={}; self.policy_parts=[]; self.policy_headings=[]
        self.feed(text)
    def handle_starttag(self, tag, attrs):
        d=dict(attrs)
        if tag in ['img','input','meta','link','br','hr','source','wbr','area','base','embed','param','track']: return
        parent=self.stack[-1] if self.stack else {}
        card=d.get('id') if 'portfolio-card' in d.get('class','').split() else parent.get('card')
        if card: self.cards.setdefault(card,[])
        policy='privacy-policy' in d.get('class','').split() or parent.get('policy',False)
        self.stack.append({'tag':tag,'card':card,'summary':'project-summary' in d.get('class','').split() or parent.get('summary',False),'policy':policy,'heading':tag=='h3' and policy})
        if tag=='h3' and policy:self.policy_headings.append('')
    def handle_endtag(self,tag):
        for i in range(len(self.stack)-1,-1,-1):
            if self.stack[i]['tag']==tag:
                self.stack=self.stack[:i];break
    def handle_data(self,data):
        if not self.stack:return
        node=self.stack[-1]
        if node['card'] and node['summary']:self.cards[node['card']].append(data)
        if node['policy']:self.policy_parts.append(data)
        if node['heading']:self.policy_headings[-1]+=data

if scope in ['full', 'content']:
    manifest=json.loads((ROOT/'docs/content-manifest.json').read_text(encoding='utf-8'))
    projects=manifest['projects']
    cards=[d for _,d in pages['portfolio.html'].nodes if 'portfolio-card' in d.get('class','').split()]
    summaries=ContentDocument(texts['portfolio.html']).cards
    check('content:109 individual projects', len(projects)==len(cards)==109 and len({p['id'] for p in projects})==109)
    check('content:project descriptions removed',all('description' not in p for p in projects) and not re.search(r'data-description|project-summary|portfolio-full-description|projectDescription',texts['portfolio.html']+css))
    by_id={c['id']:c for c in cards}
    for project in projects:
        card=by_id.get(project['id'],{})
        check(f'content:{project["id"]}:manifest/card/native descriptions absent','description' not in project and 'data-description' not in card and not ''.join(summaries.get(project['id'],[])).strip())
        check(f'content:{project["id"]}:title and media unchanged',card.get('data-title')==project['title'] and json.loads(card.get('data-media','[]'))==project['media'])
    check('content:263 media preserved',sum(len(p['media']) for p in projects)==manifest['media_count']==263)
    media_digest=hashlib.sha256(json.dumps([(p['id'],p['media']) for p in sorted(projects,key=lambda p:p['id'])],ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()).hexdigest()
    check('content:media fingerprint at accepted content14',media_digest=='0971a0e64074ef9c03801cc3b12a56dc3e415fae1ad6a7074dcd6d8a89ca40fe')
    policy_texts=[]
    expected_headings=['Просмотр сайта и поиск','Cookies, хранилище и аналитика','Изображения, видео и шрифты','Хостинг GitHub Pages','Внешние ссылки','Вопросы о конфиденциальности']
    for name,doc in pages.items():
        content=ContentDocument(texts[name]);policy=' '.join(' '.join(content.policy_parts).split());policy_texts.append(policy)
        check(f'content:{name}:six factual privacy sections',content.policy_headings==expected_headings and len(policy)>1000)
        check(f'content:{name}:existing contact and hosting sources',all(any(t=='a' and d.get('href','').startswith(url) for t,d in doc.nodes) for url in ['https://t.me/Ded_Timon','https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement']))
        check(f'content:{name}:no submission forms or embeds',not any(t in ['form','iframe'] for t,_ in doc.nodes))
        check(f'content:{name}:privacy opener and heading retained','Политика конфиденциальности' in texts[name] and any(d.get('id')=='openPrivacy' and d.get('aria-controls')=='privacyModal' for _,d in doc.nodes))
        check(f'content:{name}:policy distinguishes local viewing and external services',all(word in policy for word in ['GitHub Pages','IP','Telegram','WhatsApp','YouTube','cookies','localStorage','sessionStorage']))
    check('content:same privacy policy on every page',len(set(policy_texts))==1)
    check('content:runtime no storage or submission',not re.search(r'localStorage|sessionStorage|document\.cookie|fetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket',script))
    check('content:removed description runtime and search plumbing absent',not re.search(r'projectDescription|dataset\.description|current\.description',script))
    check('content:automatic reduced-motion still supported','prefers-reduced-motion' in script and 'prefers-reduced-motion' in css)
    if scope == 'content':write_report()

# Catalog-only checks retain all default CI gates and do not replay content/privacy locally.
if scope in ['full', 'catalog']:
    catalog_expected = {'baseline': 'owner-accepted-content-14', 'ids': ['logos-title', 'motion-title', 'characters-title', 'presentations-title', 'websites-title', 'scenes-title'], 'labels': ['Логотипы', 'Моушн-дизайн', '3D-персонажи', 'Презентации', 'Сайты', '3D-сцены и предметы'], 'order': {'logos-title': ['work-100', 'work-99', 'work-98', 'work-97', 'work-96', 'work-95', 'work-94', 'work-01', 'work-93', 'work-02', 'work-03', 'work-04', 'work-75', 'work-05', 'work-76', 'work-06', 'work-07', 'work-08', 'work-09', 'work-10', 'work-11', 'work-12', 'work-13', 'work-14', 'work-15', 'work-16'], 'motion-title': ['work-78', 'work-77', 'work-17', 'work-74', 'work-18', 'work-27', 'work-19', 'work-20', 'work-21', 'work-22', 'work-23', 'work-24', 'work-25', 'work-26'], 'characters-title': ['work-82', 'work-81', 'work-80', 'work-79', 'work-28', 'work-29', 'work-30', 'work-31', 'work-32', 'work-33', 'work-34', 'work-35'], 'presentations-title': ['work-36', 'work-37', 'work-38'], 'websites-title': ['work-109', 'work-107', 'work-108', 'work-106', 'work-105', 'work-104', 'work-103', 'work-102', 'work-101', 'work-39', 'work-40', 'work-41'], 'scenes-title': ['work-90', 'work-89', 'work-88', 'work-91', 'work-87', 'work-86', 'work-92', 'work-85', 'work-84', 'work-83', 'work-42', 'work-43', 'work-44', 'work-45', 'work-46', 'work-47', 'work-48', 'work-51', 'work-49', 'work-50', 'work-52', 'work-53', 'work-54', 'work-55', 'work-56', 'work-57', 'work-58', 'work-59', 'work-60', 'work-61', 'work-62', 'work-63', 'work-64', 'work-65', 'work-66', 'work-67', 'work-68', 'work-69', 'work-70', 'work-71', 'work-72', 'work-73']}, 'manifest_digest': 'bbf638b1f6e7249e3b7716f25df5dd6fc0c359a335c1e6b293da650d5a2c2128', 'media_digest': '0971a0e64074ef9c03801cc3b12a56dc3e415fae1ad6a7074dcd6d8a89ca40fe', 'immutable_media_digest': 'dc57ee1674e3eb25cf160250e58e61960e45ab73461883ddba8673d8cd2d28f0', 'nav_labels': ['Логотипы и графика', 'Моушн-дизайн', '3D-персонажи', 'Презентации', 'Сайты', '3D-сцены и предметы']}
    catalog_manifest=json.loads((ROOT/'docs/content-manifest.json').read_text(encoding='utf-8'))
    projects=catalog_manifest['projects']
    ordered=sorted(projects,key=lambda p:p['id'])
    canonical=lambda value:hashlib.sha256(json.dumps(value,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()).hexdigest()
    check('catalog:109 projects and263 media',len(projects)==catalog_manifest['published_project_count']==109 and sum(len(p['media']) for p in projects)==catalog_manifest['media_count']==263)
    check('catalog:only accepted content14 metadata',canonical(ordered)==catalog_expected['manifest_digest'])
    check('catalog:all media paths type preview and covers immutable',canonical([(p['id'],p['cover'],[{k:x[k] for k in ['src','type','preview']} for x in p['media']])for p in ordered])==catalog_expected['immutable_media_digest'])
    check('catalog:software metadata removed',all('tech' not in p for p in projects))
    section_cards={};category=None
    for tag,d in pages['portfolio.html'].nodes:
        if 'portfolio-category-section' in d.get('class','').split():category=d.get('aria-labelledby');section_cards[category]=[]
        if 'portfolio-card' in d.get('class','').split():section_cards.setdefault(category,[]).append(d['id'])
    check('catalog:exact six nonempty original sections',list(section_cards)==catalog_expected['ids'] and all(section_cards.values()))
    check('catalog:date-descending stable original tie order',section_cards==catalog_expected['order'])
    check('catalog:manifest normalizes to accepted section/date order',[p['id'] for category in catalog_expected['ids'] for p in sorted([p for p in projects if p['category']==category],key=lambda p:datetime.strptime(p['date'],'%d.%m.%Y'),reverse=True)]==[i for ids in catalog_expected['order'].values() for i in ids])
    check('catalog:valid real calendar dates',all(re.fullmatch(r'\d{2}\.\d{2}\.\d{4}',p['date']) and datetime.strptime(p['date'],'%d.%m.%Y') for p in projects))
    headings=[unescape(re.search(r'<h2\b[^>]*id="'+i+r'"[^>]*>(.*?)</h2>',texts['portfolio.html']).group(1)) for i in catalog_expected['ids']]
    check('catalog:original category names retained',headings==catalog_expected['labels'])
    nav=re.search(r'<nav\b[^>]*class="category-nav"[^>]*>(.*?)</nav>',texts['portfolio.html'],re.S).group(1)
    navlinks=re.findall(r'<a\b[^>]*href="#([^"]+)"[^>]*>(.*?)</a>',nav,re.S)
    check('catalog:anchor navigation retained',[(target,text.strip()) for target,text in navlinks]==list(zip(catalog_expected['ids'],catalog_expected['nav_labels'])))
    check('catalog:no AI section or link',not re.search(r'ai-title|AI-работы',texts['portfolio.html']))
    hooks=r'data-tech|project-tech\b|project-technologies|techList|tech-tags?\b|Задействованные программы'
    check('catalog:no software HTML UI or data hooks',not re.search(hooks,texts['portfolio.html']))
    check('catalog:no software runtime or search plumbing',not re.search(r'techList|tech-tag|dataset\.tech|current\.technologies',script))
    check('catalog:no unused software CSS',not re.search(r'\.project-tech\b|\.project-technologies|\.tech-tags?\b',css))
    summaries=ContentDocument(texts['portfolio.html']).cards
    cardmap={d['id']:d for _,d in pages['portfolio.html'].nodes if 'portfolio-card' in d.get('class','').split()}
    for project in projects:
        card=cardmap.get(project['id'],{})
        check(f'catalog:{project["id"]}:card/native/manifest content',card.get('data-title')==project['title'] and 'description' not in project and 'data-description' not in card and not ''.join(summaries.get(project['id'],[])).strip() and card.get('data-date')==project['date'])
        check(f'catalog:{project["id"]}:all media retained',json.loads(card.get('data-media','[]'))==project['media'])
    for project_id,title in [('work-49','Процедурный город'),('work-76','СкрруджМакДак AI иллюстрация')]:
        project=next(p for p in projects if p['id']==project_id)
        check(f'catalog:{project_id}:exact title and media alt',project['title']==project['original_title']==title and all(title in x['alt'] for x in project['media']))
    check('catalog:search prompts project titles','Название проекта' in texts['portfolio.html'] and 'Название или описание' not in texts['portfolio.html'])
    if scope=='catalog':write_report()

if scope in ['full', 'close-title']:
    for name,text in texts.items():
        titles=re.findall(r'<title\b[^>]*>(.*?)</title>',text,re.S|re.I)
        check(f'close-title:{name}:one exact tab title',titles==['DedTimon'])
    check('close-title:no runtime title writes',not re.search(r'document\.title\s*=|document\[\s*[\'"]title[\'"]\s*\]\s*=',script))
    markup=re.search(r'<button\b[^>]*id="closePortfolioModal".*?</button>',texts['portfolio.html'],re.S).group(0)
    nodes=Document(markup).nodes
    button=next(d for t,d in nodes if t=='button');svg=next(d for t,d in nodes if t=='svg');shape=next(d for t,d in nodes if t=='path')
    check('close-title:accessible project close button',button.get('type')=='button' and button.get('aria-label')=='Закрыть окно')
    check('close-title:centered24px decorative SVG',svg.get('class')=='project-close-icon' and svg.get('viewbox')=='0 0 24 24' and svg.get('width')==svg.get('height')=='24' and svg.get('aria-hidden')=='true' and svg.get('focusable')=='false')
    check('close-title:symmetric X strokes',re.findall(r'\d+',shape.get('d',''))==['4','4','20','20','20','4','4','20'] and shape.get('stroke')=='currentColor' and shape.get('stroke-width')=='2' and shape.get('stroke-linecap')=='round' and shape.get('fill')=='none')
    check('close-title:project-only CSS scope','#closePortfolioModal' in css and '.project-close-icon' in css and 'transform-box: view-box' in css)
    check('close-title:automatic reduced-motion retained','prefers-reduced-motion' in css)
    if scope=='close-title':write_report()

if scope in ['full', 'carousel']:
    class CarouselDocument(HTMLParser):
        def __init__(self,text):
            super().__init__();self.items=[];self.pending=None;self.feed(text)
        def handle_starttag(self,t,a):
            d=dict(a)
            if t=='a' and 'carousel-item' in d.get('class','').split():self.pending={'anchor':d}
            elif t=='img' and self.pending is not None:self.pending['image']=d;self.items.append(self.pending);self.pending=None
    items=CarouselDocument(texts['index.html']).items
    check('carousel:five original linked images',len(items)==5 and all(x['anchor'].get('href','').startswith('/portfolio.html') and x['image'].get('src') for x in items))
    check('carousel:native dragging disabled',all(x['anchor'].get('draggable')=='false' and x['image'].get('draggable')=='false' for x in items))
    preserved=[{part:{k:v for k,v in item[part].items() if k!='draggable'} for part in ['anchor','image']} for item in items]
    check('carousel:all original media link and accessibility attributes retained',hashlib.sha256(json.dumps(preserved,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()).hexdigest()=='53b4617dd29a2a48755f892a0bb99aaa1ea5e4c447259a42f1e1b89705977195')
    check('carousel:manual controls and status absent',not re.search(r'carousel-controls|carousel-status',texts['index.html']))
    check('carousel:no leftover controls CSS',not re.search(r'\.carousel-controls|\.carousel-status',css))
    home_script=script[script.index('function initHomeCarousel()'):script.index('function initProjectTools()',script.index('function initHomeCarousel()'))]
    check('carousel:no manual movement event handlers',not re.search(r"addEventListener\(['\"](?:keydown|touchstart|touchmove|touchend|pointerdown|pointerup|mousedown|mouseup|drag|dragstart|dragend|click)['\"]",home_script))
    check('carousel:no manual move/control/state plumbing',not re.search(r'carousel-controls|carousel-status|function move|swiped|startX|startY',home_script))
    check('carousel:original4000ms autoplay',bool(re.search(r'setTimeout\(.*?,4000\)',home_script)))
    check('carousel:existing pause guards preserved',all(x in home_script for x in ['!visible','hovered','document.hidden','reducedMotion.matches','wrap.contains(document.activeElement)','Modal.isOpen()']))
    check('carousel:single active keyboard link retained',all(x in home_script for x in ['item.inert=offset!==0','item.tabIndex=offset===0?0:-1',"item.setAttribute('aria-hidden',String(offset!==0))"]))
    if scope=='carousel':write_report()

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
check('109 substantive projects retained',len(cards)==109==manifest['published_project_count'])
check('all manifest media retained',sum(len(json.loads(c['data-media'])) for c in cards)==manifest['media_count']==263)
check('project descriptions absent',all('data-description' not in c for c in cards) and all('description' not in p for p in manifest['projects']))
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
