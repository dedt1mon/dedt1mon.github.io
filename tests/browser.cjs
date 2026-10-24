'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { chromium } = require('playwright');
const { server } = require('../tools/serve.cjs');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'test-results', process.env.TEST_OUTPUT || '');
fs.mkdirSync(out, { recursive: true });
const checks = []; const errors = []; const metrics = [];
const only = process.env.TEST_ONLY || '';
const catalogExpected = {"ids": ["logos-title", "motion-title", "characters-title", "presentations-title", "websites-title", "scenes-title"], "labels": ["Логотипы", "Моушн-дизайн", "3D-персонажи", "Презентации", "Сайты", "3D-сцены и предметы"], "nav_labels": ["Логотипы и графика", "Моушн-дизайн", "3D-персонажи", "Презентации", "Сайты", "3D-сцены и предметы"], "order": {"logos-title": ["work-01", "work-02", "work-03", "work-04", "work-75", "work-05", "work-76", "work-06", "work-07", "work-08", "work-09", "work-10", "work-11", "work-12", "work-13", "work-14", "work-15", "work-16"], "motion-title": ["work-17", "work-74", "work-18", "work-27", "work-19", "work-20", "work-21", "work-22", "work-23", "work-24", "work-25", "work-26"], "characters-title": ["work-28", "work-29", "work-30", "work-31", "work-32", "work-33", "work-34", "work-35"], "presentations-title": ["work-36", "work-37", "work-38"], "websites-title": ["work-39", "work-40", "work-41"], "scenes-title": ["work-42", "work-43", "work-44", "work-45", "work-46", "work-47", "work-48", "work-51", "work-49", "work-50", "work-52", "work-53", "work-54", "work-55", "work-56", "work-57", "work-58", "work-59", "work-60", "work-61", "work-62", "work-63", "work-64", "work-65", "work-66", "work-67", "work-68", "work-69", "work-70", "work-71", "work-72", "work-73"]}};
async function test(name, run) {
  if (only && !only.split(',').some(part => name.includes(part))) return;
  try { await run(); checks.push({ name, status: 'PASS' }); }
  catch (error) { checks.push({ name, status: 'FAIL', reason: error.message }); }
}
const instance = server();
let browser; let page; let base;
const axeSource = require.resolve('axe-core/axe.min.js');
async function load(route) {
  await page.goto(base + route, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.locator('img').first().waitFor({ state: 'visible' });
}
async function layout(target = page) {
  const result = await target.evaluate(() => {
    const width = document.documentElement.clientWidth;
    const bad = [...document.querySelectorAll('main h1, main h2, main h3, main p, main img, header, nav, main a, main input, footer')]
      .filter(el => el.getClientRects().length && !el.closest('[hidden], [aria-hidden="true"], details:not([open])'))
      .map(el => ({ tag: el.tagName, cls: el.className, rect: el.getBoundingClientRect() }))
      .filter(el => el.rect.left < -1 || el.rect.right > width + 1)
      .map(el => `${el.tag}.${el.cls}:${Math.round(el.rect.left)}..${Math.round(el.rect.right)}`);
    return { width, scrollWidth: document.documentElement.scrollWidth, bad };
  });
  assert.ok(result.scrollWidth <= result.width + 1, JSON.stringify(result));
  assert.deepEqual(result.bad, [], 'overflow: ' + result.bad.join(', '));
}
async function a11y(target = page) {
  await target.addScriptTag({ path: axeSource });
  const result = await target.evaluate(async () => {
    const result = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } });
    return { violations: result.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(n => ({ target: n.target, reason: n.failureSummary })) })), incomplete: result.incomplete.map(v => v.id) };
  });
  assert.deepEqual(result.violations, [], JSON.stringify(result.violations));
  return result;
}
function observeErrors(target) {
  target.on('pageerror', error => errors.push(error.message));
  target.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  target.on('response', response => { if (response.status() >= 400 && response.url().startsWith(base) && !response.url().includes('intentional-404')) errors.push(`${response.status()} ${response.url().replace(base, '')}`); });
}
async function assertDarkOnly(target = page) {
  assert.equal(await target.locator('.theme-toggle,[data-theme],script[src="/theme.js"]').count(),0,'Removed theme UI/bootstrap must not remain');
  assert.equal(await target.locator('.motion-toggle').count(),0);
  assert.equal(await target.locator('body').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(17, 18, 24)','Current dark palette must remain under every system preference');
}
'use strict';
// Affected content/close helpers; no media inventory, navigation or SEO replay.
async function content06Open(target, projectId, { video = false, scroll = false } = {}) {
  await target.goto(base + '/portfolio.html', { waitUntil: 'networkidle' });
  await target.evaluate(() => document.fonts.ready);
  const opener=target.locator(`#${projectId} .project-open`).first();
  await opener.click();
  await target.waitForFunction(() => getComputedStyle(document.querySelector('#portfolioModal')).opacity === '1' && getComputedStyle(document.querySelector('.portfolio-modal-content')).opacity === '1');
  if(video) {
    const index=await target.locator(`#${projectId}`).evaluate(e=>JSON.parse(e.dataset.media).findIndex(m=>m.type==='video'));
    assert.ok(index>=0);await target.locator('#galleryThumbnails button').nth(index).click();
    await target.locator('#galleryContent video').waitFor({state:'visible'});
    await target.locator('#galleryContent video').evaluate(async v=>{v.muted=true;await v.play()});
    await target.waitForFunction(()=>document.querySelector('#galleryContent video')?.currentTime>0);
  } else await target.locator('#galleryContent img').evaluate(i=>i.decode());
  await target.waitForTimeout(450);
  if(scroll) {
    const overflow=await target.locator('.portfolio-modal-content').evaluate(e=>{e.scrollTop=e.scrollHeight;return e.scrollTop});
    assert.ok(overflow>0,'Real viewer must scroll in the short viewport');
  }
  return opener;
}
async function content06Close(target, via, label, { reduced = false } = {}) {
  const before=await target.evaluate(()=>({scrollY,body:document.body.style.overflow,root:document.documentElement.style.overflow}));
  await target.evaluate(()=>{
    const modal=document.querySelector('#portfolioModal'),content=modal.querySelector('.modal-content');
    const sample=()=>{const r=content.getBoundingClientRect(),m=getComputedStyle(modal),c=getComputedStyle(content);return{t:performance.now(),cx:r.x+r.width/2,cy:r.y+r.height/2,width:r.width,height:r.height,opacity:+m.opacity,contentOpacity:+c.opacity,display:m.display,backdrop:m.backdropFilter,locked:document.body.style.overflow==='hidden'&&document.documentElement.style.overflow==='hidden',inert:document.querySelector('main').inert,inside:modal.contains(document.activeElement),ariaHidden:modal.getAttribute('aria-hidden'),media:document.querySelector('#galleryContent').childElementCount,videoPaused:document.querySelector('#galleryContent video')?.paused,scrollY,scrollTop:content.scrollTop}};
    window.__contentClose={before:sample(),frames:[],events:[],done:false};
    modal.addEventListener('site:modalclose',()=>{window.__contentClose.started=performance.now();window.__contentClose.events.push({name:'close',...sample()});queueMicrotask(()=>window.__contentClose.events.push({name:'after-close',...sample()}));const loop=()=>{window.__contentClose.frames.push(sample());if(getComputedStyle(modal).display!=='none')requestAnimationFrame(loop);else window.__contentClose.done=true};requestAnimationFrame(loop)},{once:true});
    modal.addEventListener('site:modalclosed',()=>window.__contentClose.events.push({name:'closed',...sample()}),{once:true});
  });
  if(via==='X')await target.locator('#closePortfolioModal').click();
  else if(via==='Escape')await target.keyboard.press('Escape');
  else await target.mouse.click(2,Math.floor((target.viewportSize()?.height||1000)/2));
  await target.waitForFunction(()=>window.__contentClose?.done,{},{timeout:3000});
  const trace=await target.evaluate(()=>window.__contentClose);
  fs.writeFileSync(path.join(out,`${label}-frames.json`),JSON.stringify(trace,null,2));
  const visible=trace.frames.filter(f=>f.display!=='none');
  for(const f of visible) {
    assert.ok(Math.abs(f.cx-trace.before.cx)<=1&&Math.abs(f.cy-trace.before.cy)<=1,`Viewer center moved: ${JSON.stringify(f)}`);
    assert.ok(f.locked&&f.inert&&f.inside,'Lock, background inert and modal focus must last through fade');
    assert.equal(f.ariaHidden,'false');assert.equal(f.media,trace.before.media,'Media cleanup must wait for final hide');
    assert.equal(f.scrollY,before.scrollY,'Background scroll must remain stable');
    assert.ok(f.backdrop.includes('blur('),'Backdrop must remain attached during the fade');
    assert.ok(Math.abs(f.opacity-f.contentOpacity)<.06,'Backdrop and content fade must remain synchronized');
    if(f.videoPaused!==undefined)assert.ok(f.videoPaused,'Video pauses immediately during close');
  }
  for(let i=1;i<visible.length;i++)assert.ok(visible[i].opacity<=visible[i-1].opacity+.005,'Backdrop must never blink back in');
  if(!reduced){assert.ok(visible.length>=3,'Normal motion must have multiple real rendered frames');assert.ok(visible.some(f=>f.opacity>.05&&f.opacity<.95),'Normal motion must fade, not disappear');}
  else assert.ok(trace.events.find(e=>e.name==='closed').t-trace.started<100,'Reduced motion finishes without a long transition');
  assert.equal(trace.events.filter(e=>e.name==='closed').length,1);
  const final=await target.evaluate(()=>({hidden:getComputedStyle(document.querySelector('#portfolioModal')).display==='none',aria:document.querySelector('#portfolioModal').getAttribute('aria-hidden'),inert:document.querySelector('main').inert,body:document.body.style.overflow,root:document.documentElement.style.overflow,media:document.querySelector('#galleryContent').childElementCount,focus:document.activeElement.closest('.portfolio-card')?.id,scrollY}));
  assert.ok(final.hidden&&!final.inert);assert.equal(final.aria,'true');assert.equal(final.body,'');assert.equal(final.root,'');assert.equal(final.media,0);assert.equal(final.scrollY,before.scrollY);
  return {trace,final};
}

async function catalog07Order(target=page) {
  return target.locator('.portfolio-category-section').evaluateAll(sections=>Object.fromEntries(sections.map(s=>[s.getAttribute('aria-labelledby'),[...s.querySelectorAll('.portfolio-card')].map(c=>c.id)])));
}
async function catalog07NoSoftware(target=page) {
  assert.equal(await target.locator('[data-tech],.project-tech,.project-technologies,#techList,.tech-tags,.tech-tag').count(),0,'No software display or hidden data hooks');
  assert.ok(!/Задействованные программы|Geometry Nodes|After Effects|Blender|Figma|OpenAI|PowerPoint|Visual Studio Code/i.test(await target.locator('body').innerText()));
}

async function closeTitle08Probe(target, label, {reduced=false, screenshot=false}={}) {
  await target.mouse.move(0,0);
  await target.evaluate(()=>{
    const button=document.querySelector('#closePortfolioModal'),icon=button.querySelector('.project-close-icon'),panel=button.closest('.modal-content'),modal=button.closest('.modal');
    const matrix=node=>{const m=new DOMMatrixReadOnly(getComputedStyle(node).transform);return {a:m.a,b:m.b,c:m.c,d:m.d,e:m.e,f:m.f}};
    const sample=()=>{const r=button.getBoundingClientRect(),ir=icon.getBoundingClientRect(),pr=panel.getBoundingClientRect(),pm=matrix(panel),sx=Math.hypot(pm.a,pm.b),sy=Math.hypot(pm.c,pm.d),style=getComputedStyle(icon);return{t:performance.now(),phase:window.closeTitle08.phase,visible:getComputedStyle(modal).display!=='none',button:{width:r.width/sx,height:r.height/sy,cx:(r.x+r.width/2-pr.x)/sx+panel.scrollLeft,cy:(r.y+r.height/2-pr.y)/sy+panel.scrollTop,matrix:matrix(button)},icon:{cx:(ir.x+ir.width/2-r.x-r.width/2)/sx,cy:(ir.y+ir.height/2-r.y-r.height/2)/sy,width:parseFloat(style.width),height:parseFloat(style.height),matrix:matrix(icon)},parentScale:{x:sx,y:sy}}};
    window.closeTitle08={phase:'rest',frames:[],done:false};window.closeTitle08.before=sample();const start=performance.now();const loop=()=>{window.closeTitle08.frames.push(sample());if(getComputedStyle(modal).display!=='none'&&performance.now()-start<5000)requestAnimationFrame(loop);else window.closeTitle08.done=true};requestAnimationFrame(loop);
  });
  await target.evaluate(()=>window.closeTitle08.phase='hover');await target.locator('#closePortfolioModal').hover();await target.waitForFunction(reduce=>{const m=new DOMMatrixReadOnly(getComputedStyle(document.querySelector('.project-close-icon')).transform);return reduce?Math.abs(m.b)<.00001:Math.abs(m.b-1)<.00001&&Math.abs(m.a)<.00001},reduced,{timeout:2000});await target.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  if(screenshot){const r=await target.locator('#closePortfolioModal').boundingBox();await target.screenshot({path:path.join(out,`${label}-hover.png`),clip:{x:Math.max(0,r.x-20),y:Math.max(0,r.y-20),width:84,height:84}});}
  await target.evaluate(()=>window.closeTitle08.phase='unhover');await target.mouse.move(0,0);await target.waitForFunction(()=>getComputedStyle(document.querySelector('.project-close-icon')).transform==='none',{},{timeout:2000});await target.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  await target.evaluate(()=>window.closeTitle08.phase='click-hover');await target.locator('#closePortfolioModal').hover();await target.waitForFunction(reduce=>{const m=new DOMMatrixReadOnly(getComputedStyle(document.querySelector('.project-close-icon')).transform);return reduce?Math.abs(m.b)<.00001:Math.abs(m.b-1)<.00001&&Math.abs(m.a)<.00001},reduced,{timeout:2000});await target.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  await target.evaluate(()=>window.closeTitle08.phase='close');await target.locator('#closePortfolioModal').click();await target.locator('#portfolioModal').waitFor({state:'hidden'});await target.waitForFunction(()=>window.closeTitle08.done);
  const trace=await target.evaluate(()=>window.closeTitle08);fs.writeFileSync(path.join(out,`${label}-frames.json`),JSON.stringify(trace,null,2));
  const frames=trace.frames.filter(f=>f.visible),identity=m=>Math.abs(m.a-1)<.00001&&Math.abs(m.b)<.00001&&Math.abs(m.c)<.00001&&Math.abs(m.d-1)<.00001&&Math.abs(m.e)<.00001&&Math.abs(m.f)<.00001;
  for(const f of frames){
    assert.ok(identity(f.button.matrix),'Project button itself must never rotate, scale or translate');
    assert.ok(Math.abs(f.button.width-44)<.05&&Math.abs(f.button.height-44)<.05,'Button stays44 CSSpx after inherited modal-scale normalization');
    assert.ok(Math.abs(f.button.cx-trace.before.button.cx)<.1&&Math.abs(f.button.cy-trace.before.button.cy)<.1,'Button local center must remain fixed through hover, scroll-to-control and close');
    assert.equal(f.icon.width,24);assert.equal(f.icon.height,24);assert.ok(Math.abs(f.icon.cx)<.05&&Math.abs(f.icon.cy)<.05,'SVG center must coincide with button center');
    const m=f.icon.matrix;assert.ok(Math.abs(Math.hypot(m.a,m.b)-1)<.0001&&Math.abs(Math.hypot(m.c,m.d)-1)<.0001&&Math.abs(m.a*m.c+m.b*m.d)<.0001,'Icon rotation must have unit scale and no skew');assert.ok(Math.abs(m.e)<.00001&&Math.abs(m.f)<.00001,'No local translation');
    if(reduced)assert.ok(identity(m),'Reduced motion must suppress rotation, not only transition time');
  }
  assert.ok(frames.length>=2);
  if(!reduced){assert.ok(frames.some(f=>f.phase==='hover'&&f.icon.matrix.b>.1&&f.icon.matrix.b<.99),'Actual intermediate icon rotation sampled');assert.ok(frames.some(f=>f.phase==='hover'&&Math.abs(f.icon.matrix.b-1)<.001));assert.ok(frames.some(f=>f.phase==='unhover'&&identity(f.icon.matrix)));assert.ok(frames.some(f=>f.phase==='close'&&f.parentScale.x<.99),'Click check must sample inherited panel shrink without treating it as button scale');}
  return trace;
}

(async () => {
  await new Promise(resolve => instance.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${instance.address().port}`;
  browser = await chromium.launch({ headless: true });
  page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  observeErrors(page);
  for (const width of [320, 375, 430, 768, 1024, 1440, 1920]) {
    for (const route of ['/', '/portfolio.html', '/services.html']) {
      await test(`responsive:${width}:${route}`, async () => {
        await page.setViewportSize({ width, height: 1000 }); await load(route); await assertDarkOnly(); await layout();

        await page.screenshot({ path: path.join(out, `view-${width}-${route === '/' ? 'home' : route.slice(1,-5)}.png`), fullPage: route !== '/portfolio.html' });
        assert.equal(await page.locator('.motion-toggle').count(), 0);
        assert.ok(!/©|Возобновить анимации|Приостановить анимации/.test(await page.locator('footer').innerText()));
        if ([375,1440].includes(width)) await page.screenshot({path:path.join(out,`viewport-${width}-${route==='/'?'home':route.slice(1,-5)}.png`)});
        const broken = await page.locator('img').evaluateAll(images => images.filter(i => i.loading !== 'lazy' && (!i.complete || !i.naturalWidth)).map(i => i.src));
        assert.deepEqual(broken, []);
        if (width <= 768) {
          const burger = page.locator('#burgerBtn');
          if (await burger.isVisible()) {
            const box = await burger.boundingBox(); assert.ok(box.width >= 44 && box.height >= 44);
            await burger.click(); assert.equal(await burger.getAttribute('aria-expanded'), 'true');
            await page.getByRole('navigation', { name: 'Основная навигация' }).getByRole('link', { name: 'Проекты', exact: true }).waitFor({ state: 'visible' });
            await layout(); await page.keyboard.press('Escape');
            assert.equal(await burger.getAttribute('aria-expanded'), 'false');
            assert.equal(await page.evaluate(() => document.activeElement.id), 'burgerBtn');
          }
        }
      });
    }
  }
  for (const width of [375, 1440]) for (const route of ['/', '/portfolio.html', '/services.html']) {
    await test(`accessibility:${width}:${route}`, async () => {
      await page.setViewportSize({ width, height: 1000 }); await load(route); await a11y();
    });
  }
  await test('keyboard:skip-link+visible-focus', async () => {
    await load('/'); await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.className), 'skip-link');
    const box=await page.locator('.skip-link').boundingBox(); assert.ok(box.y >= 0, 'Focused skip-link offscreen: '+JSON.stringify(box));
    await page.keyboard.press('Enter'); assert.equal(await page.evaluate(() => document.activeElement.id), 'main-content');
  });
  await test('gallery:keyboard+focus+native-files', async () => {
    await load('/portfolio.html'); const opener=page.locator('.project-open').first();
    await opener.focus(); await page.keyboard.press('Enter');
    const modal=page.locator('#portfolioModal'); await modal.waitFor({state:'visible'});
    assert.equal(await modal.getAttribute('aria-hidden'),'false');
    assert.ok(await page.locator('main').evaluate(el=>el.inert));
    const first=await page.locator('#galleryContent img').getAttribute('src');
    await page.keyboard.press('ArrowRight');
    await page.waitForFunction(prev=>document.querySelector('#galleryContent img')?.getAttribute('src')!==prev,first);
    await a11y();
    for(let i=0;i<15;i++) { await page.keyboard.press('Tab'); assert.ok(await page.evaluate(()=>!!document.activeElement.closest('#portfolioModal'))); }
    await page.keyboard.press('Escape'); await modal.waitFor({state:'hidden'});
    assert.ok(await opener.evaluate(el=>el===document.activeElement));
    assert.equal(await page.locator('main').evaluate(el=>el.inert),false);
    assert.equal(await page.locator('.portfolio-card .project-files').count(),76);
    assert.equal(await page.locator('.portfolio-card .project-files:visible').count(),0);
    assert.equal(await page.locator('.project-files a').count(),211);
  });
  await test('gallery:real-video-playback+cleanup', async () => {
    await load('/portfolio.html');
    const card=page.locator('.portfolio-card').filter({hasText:'Анимированная монета'}).first();
    await card.locator('.project-open').first().click();
    const raw=JSON.parse(await card.getAttribute('data-media')); const index=raw.findIndex(x=>x.type==='video'); assert.ok(index>=0);
    await page.locator('#galleryThumbnails button').nth(index).click();
    const video=page.locator('#galleryContent video'); await video.waitFor();
    assert.equal(await video.evaluate(v=>v.autoplay),false);
    await video.evaluate(async v=>{ v.muted=true; await v.play(); });
    await page.waitForFunction(()=>document.querySelector('#galleryContent video')?.currentTime>0.05,null,{timeout:15000});
    await page.locator('#closePortfolioModal').click(); await page.locator('#portfolioModal').waitFor({state:'hidden'});
    assert.equal(await page.locator('#galleryContent video').count(),0);
  });
  await test('portfolio:search+zero-results+reset', async () => {
    await load('/portfolio.html'); await page.locator('#projectToolsToggle').click(); const input=page.locator('#projectSearch'); await input.fill('сакурой');
    await page.waitForFunction(()=>[...document.querySelectorAll('.portfolio-card')].filter(c=>!c.hidden).length===1);
    await input.fill('zzzzzz-nothing'); await page.waitForFunction(()=>[...document.querySelectorAll('.portfolio-card')].every(c=>c.hidden));
    assert.ok((await page.locator('#searchStatus').textContent()).length>0);
    await input.fill(''); await page.waitForFunction(()=>[...document.querySelectorAll('.portfolio-card')].filter(c=>!c.hidden).length===76);
  });
  await test('privacy:dialog+return-focus', async () => {
    await page.emulateMedia({reducedMotion:'reduce'});
    for(const width of [375,1440]) for(const route of ['/','/portfolio.html','/services.html','/404.html']) {
      await page.setViewportSize({width,height:1000});await load(route);
      const opener=page.locator('#openPrivacy');assert.equal((await opener.textContent()).trim(),'Политика конфиденциальности');
      assert.equal(await opener.getAttribute('aria-controls'),'privacyModal');
      await opener.focus();await page.keyboard.press('Enter');await page.locator('#privacyModal').waitFor({state:'visible'});
      assert.equal((await page.locator('#privacy-title').textContent()).trim(),'Политика конфиденциальности');
      assert.equal(await page.locator('#privacyModal').getAttribute('aria-labelledby'),'privacy-title');
      await a11y();if(route==='/')await page.screenshot({path:path.join(out,`privacy-${width}.png`)});await page.keyboard.press('Escape');await page.locator('#privacyModal').waitFor({state:'hidden'});
      assert.equal(await page.evaluate(()=>document.activeElement.id),'openPrivacy');
    }
  });
  await test('portfolio:all-cover-images+category-links', async () => {
    await load('/portfolio.html');
    const images=page.locator('.portfolio-media img');
    for(let i=0;i<await images.count();i++) {
      await images.nth(i).scrollIntoViewIfNeeded();
      await images.nth(i).evaluate(img=>img.decode());
      assert.ok(await images.nth(i).evaluate(img=>img.naturalWidth>0));
    }
    const anchors=await page.locator('.category-nav a').evaluateAll(a=>a.map(x=>x.hash));
    for(const hash of anchors) assert.ok(await page.locator(hash).count());
    await layout();
  });
  await test('no-JS:content+navigation+media-fallback', async () => {
    const context=await browser.newContext({javaScriptEnabled:false,reducedMotion:'reduce',viewport:{width:375,height:900}});
    const fallback=await context.newPage(); await fallback.goto(base+'/portfolio.html',{waitUntil:'networkidle'});await fallback.evaluate(()=>document.fonts.ready);
    assert.equal(await fallback.locator('.portfolio-card').count(),76);
    assert.equal(await fallback.locator('.project-files summary:visible').count(),76);
    for (const summary of await fallback.locator('.project-files summary').all()) await summary.click();
    assert.equal(await fallback.locator('.project-summary:visible').count(),76);
    assert.equal(await fallback.locator('.project-tech,[data-tech]').count(),0);
    assert.equal(await fallback.locator('.project-files a:visible').count(),211);
    assert.ok(await fallback.getByRole('navigation',{name:'Основная навигация'}).isVisible());
    assert.ok(await fallback.locator('.project-files a').first().isVisible());
    await context.close();
  });
  await test('text-zoom:200-percent-mobile', async () => {
    await page.setViewportSize({width:375,height:1000}); await load('/');
    await page.addStyleTag({content:'html { font-size: 200% !important; }'}); await layout();
  });
  await test('performance:home-resource-budget+CLS+no-autoplay', async () => {
    await page.setViewportSize({width:1440,height:1000});
    await page.addInitScript(()=>{window.__cls=0;new PerformanceObserver(list=>{for(const e of list.getEntries())if(!e.hadRecentInput)window.__cls+=e.value;}).observe({type:'layout-shift',buffered:true});});
    await load('/');
    const result=await page.evaluate(()=>({cls:window.__cls||0,resources:performance.getEntriesByType('resource').map(r=>({name:r.name.split('/').pop(),bytes:r.transferSize,type:r.initiatorType})),autoplay:document.querySelectorAll('[autoplay]').length}));
    result.bytes=result.resources.reduce((n,r)=>n+r.bytes,0); metrics.push(result);
    assert.ok(result.cls<0.1,JSON.stringify(result));
    assert.ok(result.bytes<1800000,JSON.stringify(result));
    assert.equal(result.autoplay,0);
  });
  await test('404:usable-page', async () => {
    const response=await page.goto(base+'/intentional-404'); assert.equal(response.status(),404);
    await page.getByRole('heading',{name:'Здесь пока пусто.'}).waitFor();
    assert.equal(await page.getByRole('link',{name:'На главную',exact:true}).getAttribute('href'),'/');
  });
  await test('identity:home-composition+carousel-keyboard', async () => {
    await page.setViewportSize({width:1440,height:1000}); await load('/');
    assert.deepEqual(await page.locator('main > section').evaluateAll(es=>es.map(e=>e.className)),['hero','carousel-section','popular-services','contacts-section']);
    assert.equal(await page.locator('.hero-art').count(),0);
    assert.equal(await page.locator('.carousel-item').count(),5);
    assert.equal(await page.locator('.popular-services .svc').count(),3);
    const title=await page.locator('.hero-title').boundingBox(); assert.ok(Math.abs(title.x+title.width/2-720)<4);
    const current=()=>page.locator('.carousel-item[data-position="current"]');
    const first=await current().getAttribute('href'); await current().focus();
    await page.keyboard.press('ArrowRight'); assert.equal(await current().getAttribute('data-index'),'1');
    assert.ok(await current().evaluate(el=>el===document.activeElement));
    await page.keyboard.press('End'); assert.equal(await current().getAttribute('data-index'),'4');
    await page.keyboard.press('ArrowRight'); assert.equal(await current().getAttribute('href'),first);
    assert.equal(await page.locator('.carousel-item:not([inert])').count(),1);
    await page.locator('.carousel-controls .previous').click(); assert.equal(await current().getAttribute('data-index'),'4');
    await page.locator('.carousel-controls .next').click(); assert.equal(await current().getAttribute('data-index'),'0');
    assert.equal(await page.locator('.carousel-item[tabindex="0"]').count(),1);
    await a11y();
  });
  await test('identity:mobile-carousel+tools-focus', async () => {
    for(const width of [320,375,430]) {
      await page.setViewportSize({width,height:900}); await load('/');
      for(const selector of ['.carousel-controls .previous','.carousel-controls .next']) {
        await page.locator(selector).scrollIntoViewIfNeeded(); const box=await page.locator(selector).boundingBox();
        assert.ok(box.width>=44&&box.height>=44&&box.x>=0&&box.x+box.width<=width);
        await page.locator(selector).click();
      }
      await load('/portfolio.html'); const toggle=page.locator('#projectToolsToggle');
      await toggle.click(); assert.equal(await toggle.getAttribute('aria-expanded'),'true');
      assert.equal(await page.evaluate(()=>document.activeElement.id),'projectSearch'); await layout();
      await page.keyboard.press('Escape'); assert.equal(await toggle.getAttribute('aria-expanded'),'false');
      assert.ok(await toggle.evaluate(el=>el===document.activeElement));
      await toggle.click(); await page.locator('.category-nav a[href="#scenes-title"]').click();
      assert.equal(await page.evaluate(()=>document.activeElement.id),'scenes-title');
      assert.equal(await toggle.getAttribute('aria-expanded'),'false'); await layout();
    }
  });
  await test('identity:no-JS-home-carousel-and-original-services', async () => {
    const context=await browser.newContext({javaScriptEnabled:false,viewport:{width:320,height:900}});
    const fallback=await context.newPage();await fallback.goto(base+'/');
    assert.equal(await fallback.locator('.carousel-item:visible').count(),5);
    for(const link of await fallback.locator('.carousel-item').all())assert.ok((await link.getAttribute('href')).startsWith('/portfolio.html'));
    assert.equal(await fallback.locator('.carousel-controls:visible').count(),0);
    assert.ok(await fallback.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await fallback.goto(base+'/services.html'); assert.equal(await fallback.locator('.svc').count(),8);
    await fallback.getByRole('heading',{name:'TG-Бот',exact:true}).waitFor();
    await fallback.getByRole('heading',{name:'ChatGPT',exact:true}).waitFor();
    await context.close();
  });
  await test('identity:original-mobile-card-alignment+disclosure', async () => {
    for (const width of [320,375,430,768]) {
      await page.setViewportSize({width,height:1000}); await load('/portfolio.html');
      const card=page.locator('.portfolio-card').first();
      for (const selector of ['.portfolio-title','.portfolio-date']) assert.equal(await card.locator(selector).evaluate(e=>getComputedStyle(e).textAlign),'right');
      assert.equal(await card.locator('.project-summary').isVisible(),false);
      await card.locator('.project-open').first().focus();await page.keyboard.press('Enter');await page.locator('#portfolioModal').waitFor({state:'visible'});
      assert.ok(await page.locator('#projectDescription').isVisible());await page.keyboard.press('Escape');await layout();
    }
  });
  await test('identity:compact-gallery-natural-aspect+mobile-controls', async () => {
    for (const width of [320,375,430,768,1440]) {
      await page.setViewportSize({width,height:1000}); await load('/portfolio.html');
      await page.locator('.project-open').first().click(); await page.locator('#portfolioModal').waitFor({state:'visible'});
      const img=page.locator('#galleryContent img'); await img.evaluate(i=>i.decode());
      const media=await img.boundingBox(); const main=await page.locator('.gallery-main').boundingBox();
      const box=await page.locator('.portfolio-modal-content').boundingBox();
      assert.ok(box.width<=601&&box.x>=0&&box.x+box.width<=width);
      assert.ok(Math.abs(main.height-media.height)<2,'Gallery must follow media height, not an empty fixed-height stage');
      const ratio=await img.evaluate(i=>i.naturalWidth/i.naturalHeight);
      assert.ok(Math.abs(media.width/media.height-ratio)<0.02,'Image aspect ratio changed');
      for (const selector of ['.gallery-prev','.gallery-next','#closePortfolioModal']) {
        const control=await page.locator(selector).boundingBox(); assert.ok(control.width>=44&&control.height>=44&&control.x>=box.x&&control.x+control.width<=box.x+box.width);
      }
      const date=page.locator('.portfolio-completion-date'); await date.scrollIntoViewIfNeeded();assert.ok(await date.isVisible());
      assert.ok(await page.locator('.portfolio-modal-content').evaluate(e=>e.scrollWidth<=e.clientWidth+1));
      if ([375,1440].includes(width)) { await page.locator('.portfolio-modal-content').evaluate(e=>e.scrollTop=0); await page.screenshot({path:path.join(out,`gallery-${width}.png`)}); }
      await page.keyboard.press('Escape');
    }
  });
  await test('identity:reduced-motion-and-normal-motion', async () => {
    await page.setViewportSize({width:1440,height:1000}); await page.emulateMedia({reducedMotion:'no-preference'}); await load('/');
    const animations=await page.locator('.logo-img,.hero-title,.accent').evaluateAll(es=>es.map(e=>({name:getComputedStyle(e).animationName,count:getComputedStyle(e).animationIterationCount})));
    assert.ok(animations.some(x=>x.name!=='none'));assert.ok(animations.every(x=>x.count==='infinite'));
    await page.emulateMedia({reducedMotion:'reduce'});
    assert.ok(await page.locator('.logo-img,.hero-title,.accent').evaluateAll(es=>es.every(e=>getComputedStyle(e).animationName==='none')));
    await page.locator('.carousel-controls .next').click();
    assert.equal(await page.locator('.carousel-item[data-position="current"]').getAttribute('data-index'),'1');
  });
  await test('accessibility:focus-contrast', async () => {
    for (const width of [375,1440]) for (const route of ['/','/portfolio.html','/services.html']) {
      await page.setViewportSize({width,height:1000});await load(route);
      for (const selector of ['.brand',route==='/'?'.section-button':route==='/services.html'?'.clickable-card':'.portfolio-title a']) {
        await page.keyboard.press('Tab');await page.locator(selector).first().focus();
        const ring=await page.locator(selector).first().evaluate(el=>{
          const rgb=value=>{const n=value.match(/[\d.]+/g).map(Number);return [n[0],n[1],n[2],n.length>3?n[3]:1];};
          let background=[255,255,255];const parents=[];for(let n=el.parentElement;n;n=n.parentElement)parents.push(n);
          for(const n of parents.reverse()){const c=rgb(getComputedStyle(n).backgroundColor);background=background.map((v,i)=>c[i]*c[3]+v*(1-c[3]));}
          const style=getComputedStyle(el),foreground=rgb(style.outlineColor);
          const luminance=c=>c.slice(0,3).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((a,v,i)=>a+v*[.2126,.7152,.0722][i],0);
          const a=luminance(foreground),b=luminance(background);
          return {ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05),visible:el.matches(':focus-visible'),style:style.outlineStyle,width:parseFloat(style.outlineWidth)};
        });
        assert.ok(ring.visible&&ring.style==='solid'&&ring.width>=3);
        assert.ok(ring.ratio>=3,`${route} ${selector} at ${width}: focus contrast ${ring.ratio}`);
      }
    }
  });
  await test('motion:original-timing-autoplay-reduced-motion-and-swipe', async () => {
    await page.emulateMedia({reducedMotion:'no-preference'});await page.setViewportSize({width:1440,height:1000});await load('/');
    const timing=await page.locator('.hero-title,.logo-img,.hero-title .accent').evaluateAll(es=>es.map(e=>({cls:e.className,duration:getComputedStyle(e).animationDuration,iterations:getComputedStyle(e).animationIterationCount,easing:getComputedStyle(e).animationTimingFunction})));
    assert.deepEqual(timing.map(x=>x.duration),['4s','6s','4s']);assert.ok(timing.every(x=>x.iterations==='infinite'&&x.easing==='ease-in-out'));
    assert.equal(await page.locator('.hero-brand').count(),0);
    await page.locator('#carousel').scrollIntoViewIfNeeded();await page.mouse.move(0,0);
    const current=()=>page.locator('.carousel-item[data-position="current"]');
    const first=await current().getAttribute('data-index');await page.waitForTimeout(4200);
    assert.notEqual(await current().getAttribute('data-index'),first,'Original 4-second rotation is missing');
    const transition=await current().evaluate(e=>getComputedStyle(e).transitionDuration);assert.ok(transition.split(',').every(v=>v.trim()==='0.6s'));
    await current().focus();const focused=await current().getAttribute('data-index');await page.waitForTimeout(4200);assert.equal(await current().getAttribute('data-index'),focused,'Autoplay must pause during keyboard interaction');
    await page.keyboard.press('ArrowRight');assert.notEqual(await current().getAttribute('data-index'),focused);
    assert.equal(await page.locator('.motion-toggle').count(),0,'Manual animation controls were removed');
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.waitForFunction(()=>getComputedStyle(document.querySelector('.hero-title')).animationName==='none');
    assert.equal(await page.locator('.hero-title').evaluate(e=>getComputedStyle(e).animationName),'none');
    await page.locator('#carousel').scrollIntoViewIfNeeded();await page.mouse.move(0,0);await current().evaluate(e=>e.blur());const paused=await current().getAttribute('data-index');await page.waitForTimeout(4200);assert.equal(await current().getAttribute('data-index'),paused,'Reduced motion must disable auto-rotation without a manual control');
    const beforeSwipe=await current().getAttribute('data-index');
    const box=await page.locator('#carousel').boundingBox();const cdp=await page.context().newCDPSession(page);const x=Math.round(box.x+box.width/2),y=Math.round(box.y+box.height/2);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:x+80,y}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x-80,y}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();
    assert.notEqual(await current().getAttribute('data-index'),beforeSwipe);
  });
  await test('motion:original-carousel-hidden-trajectory', async () => {
    await page.emulateMedia({reducedMotion:'no-preference'});
    for(const width of [375,1440]) {
      await page.setViewportSize({width,height:1000});await load('/');
      const current=page.locator('.carousel-item[data-position="current"]');
      await current.focus();
      const incoming=page.locator('.carousel-item[data-index="2"]');
      await page.waitForFunction(()=>{const s=getComputedStyle(document.querySelector('.carousel-item[data-index="2"]'));return s.transform==='none'&&s.filter==='blur(6px)'&&s.opacity==='0';},null,{timeout:1500});
      assert.ok(await incoming.evaluate(e=>getComputedStyle(e).transitionDuration.split(',').every(v=>v.trim()==='0.6s')));
      const hidden=await incoming.evaluate(e=>{const s=getComputedStyle(e);return {transform:s.transform,filter:s.filter,opacity:s.opacity};});
      assert.deepEqual(hidden,{transform:'none',filter:'blur(6px)',opacity:'0'},'Original hidden cards stay centered, unscaled and blurred');
      await page.keyboard.press('ArrowRight');assert.equal(await incoming.getAttribute('data-position'),'next');
      await page.waitForTimeout(150);
      const middle=await incoming.evaluate(e=>{const s=getComputedStyle(e);return {x:new DOMMatrix(s.transform).m41,easing:s.transitionTimingFunction};});
      const side=width===375?280:360;
      assert.ok(middle.x>0&&middle.x<side,`Incoming original trajectory must move outwards from center: ${middle.x}`);
      assert.ok(middle.easing.includes('cubic-bezier(0.25, 0.46, 0.45, 0.94)'));
      await page.waitForFunction(target=>{const s=getComputedStyle(document.querySelector('.carousel-item[data-index="2"]'));return new DOMMatrix(s.transform).m41===target&&s.filter==='blur(2px)';},side,{timeout:1500});
      const settled=await incoming.evaluate(e=>({x:new DOMMatrix(getComputedStyle(e).transform).m41,filter:getComputedStyle(e).filter}));
      assert.equal(settled.x,side);assert.equal(settled.filter,'blur(2px)');
      await page.keyboard.press('ArrowLeft');
      await page.waitForFunction(()=>{const s=getComputedStyle(document.querySelector('.carousel-item[data-index="2"]'));return s.transform==='none'&&s.filter==='blur(6px)';},null,{timeout:1500});
      assert.equal(await incoming.evaluate(e=>getComputedStyle(e).transform),'none');
      assert.equal(await incoming.evaluate(e=>getComputedStyle(e).filter),'blur(6px)');
    }
  });
  await test('motion:original-hover-reveal-and-pointer-cleanup', async () => {
    await page.emulateMedia({reducedMotion:'no-preference'});await page.setViewportSize({width:1440,height:1000});await load('/portfolio.html');
    await page.waitForTimeout(650);const card=page.locator('.portfolio-card').first();await card.hover();await page.waitForTimeout(550);
    const matrix=await card.locator('.portfolio-media > a img').evaluate(e=>getComputedStyle(e).transform);assert.ok(matrix.startsWith('matrix(1.1,'),matrix);
    assert.equal(await page.locator('.portfolio-card .project-files').count(),76);
    assert.equal(await page.locator('.portfolio-card .project-files:visible').count(),0);
    assert.equal(await page.locator('.contacts-section,.category-count,.category-nav a span').count(),0);
    await page.locator('#projectToolsToggle').click();await page.waitForTimeout(320);
    assert.equal(await page.locator('#projectToolsToggle').getAttribute('aria-expanded'),'true');await page.keyboard.press('Escape');
    await load('/services.html');assert.equal(await page.locator('.svc .text-link').count(),0);assert.equal(await page.locator('.svc > a.clickable-card').count(),8);
    await page.waitForTimeout(1100);assert.equal(await page.locator('.svc').first().evaluate(e=>getComputedStyle(e).opacity),'1');
    const last=page.locator('.svc').last();await last.scrollIntoViewIfNeeded();await page.waitForTimeout(70);
    const reveal=await last.evaluate(e=>e.getAnimations().map(a=>a.effect.getTiming()));assert.ok(reveal.some(a=>a.duration===600&&a.delay===480&&a.easing==='ease'));
    assert.ok(await last.locator('img').evaluate(e=>e.getAnimations().some(a=>a.effect.getTiming().duration===500)));
    await page.waitForTimeout(1100);assert.equal(await last.evaluate(e=>getComputedStyle(e).opacity),'1');
    await page.mouse.move(400,200);await page.waitForTimeout(100);await page.mouse.move(420,220);assert.ok(await page.locator('.blue-particle').count()>0);
    const lifetimes=await page.locator('.blue-particle').evaluateAll(es=>es.flatMap(e=>e.getAnimations().map(a=>a.effect.getTiming())));
    assert.ok(lifetimes.length>0&&lifetimes.every(t=>Math.abs(t.duration-28*1000/60)<.001&&t.iterations===1),'Original particles remain finite, 28 frames at 60Hz');
    await page.waitForFunction(()=>document.querySelectorAll('.blue-particle').length===0,null,{timeout:1500});
    await page.waitForTimeout(120);assert.equal(await page.locator('.blue-particle').count(),0,'Particles must not keep an idle loop alive');
    await page.emulateMedia({reducedMotion:'reduce'});await page.mouse.move(450,230);assert.equal(await page.locator('.blue-particle').count(),0);
  });
  await test('identity:measured-original-service-layout', async () => {
    await page.emulateMedia({reducedMotion:'reduce'});
    for (const width of [320,375,430,768,1024,1440,1920]) for (const route of ['/','/services.html']) {
      await page.setViewportSize({width,height:1000});await load(route);
      const data=await page.locator('.services-grid > .svc').evaluateAll(es=>es.map(e=>({top:e.offsetTop,width:e.querySelector('.svc-card').offsetWidth,x:e.querySelector('.svc-card').getBoundingClientRect().x})));
      const expectedWidth=Math.min(320,width-(route==='/'?62:72));
      const columns=route==='/'?(width<=768?1:width<=1100?2:3):(width<=480?1:width<=1100?2:3);
      assert.equal(data[0].width,expectedWidth,`${route} at ${width}: original card width`);
      assert.equal(data.filter(e=>Math.abs(e.top-data[0].top)<2).length,columns,`${route} at ${width}: original columns`);
      if(width<=430)assert.ok(Math.abs(data[0].x-(width-expectedWidth)/2)<1);
      await layout();
    }
  });
  await test('motion:reduced-panels-navigation-and-gallery-remain-visible', async () => {
    await page.emulateMedia({reducedMotion:'reduce'});
    for(const width of [375,1440]) {
      await page.setViewportSize({width,height:1000});await load('/portfolio.html');assert.equal(await page.locator('.motion-toggle').count(),0);
      await page.locator('#projectToolsToggle').click();
      assert.equal(await page.locator('#projectTools').evaluate(e=>getComputedStyle(e).opacity),'1');
      assert.equal(await page.evaluate(()=>document.activeElement.id),'projectSearch');
      await page.locator('#projectSearch').fill('zzzzzz');await page.locator('#projectSearch').fill('');
      assert.ok(await page.locator('.portfolio-grid').evaluateAll(es=>es.every(e=>getComputedStyle(e).opacity==='1')));
      await page.locator('.category-nav a').first().click();
      assert.equal(await page.locator('.portfolio-category-section h2').first().evaluate(e=>e.getAnimations().length),0);
      await page.locator('.project-open').first().click();await page.waitForFunction(()=>getComputedStyle(document.querySelector('#portfolioModal')).opacity==='1');
      assert.equal(await page.locator('.portfolio-modal-content').evaluate(e=>getComputedStyle(e).opacity),'1');await page.keyboard.press('Escape');
      if(width===375){await page.locator('#burgerBtn').click();assert.equal(await page.locator('#top-nav').evaluate(e=>getComputedStyle(e).opacity),'1');await page.keyboard.press('Escape');}
    }
  });
  await test('dark-only:system-light-and-no-JS-remain-dark', async () => {
    for(const javaScriptEnabled of [true,false]) {
      const context=await browser.newContext({javaScriptEnabled,colorScheme:'light',reducedMotion:'reduce',viewport:{width:375,height:1000}});
      try {
        const probe=await context.newPage();observeErrors(probe);
        for(const route of ['/','/portfolio.html','/services.html','/404.html']) {
          await probe.goto(base+route);await assertDarkOnly(probe);await layout(probe);
          assert.equal((await probe.locator('#openPrivacy').textContent()).trim(),'Политика конфиденциальности');
          if(!javaScriptEnabled)assert.ok(await probe.getByRole('navigation',{name:'Основная навигация'}).isVisible());
          assert.equal(await probe.locator('h1').count(),1);
          assert.equal(await probe.locator('html,body,main img').evaluateAll(es=>es.filter(e=>getComputedStyle(e).filter.includes('invert(')).length),0);
          await probe.emulateMedia({colorScheme:'dark'});await assertDarkOnly(probe);
          await probe.emulateMedia({colorScheme:'light'});await probe.reload();await assertDarkOnly(probe);
        }
      } finally {await context.close();}
    }
  });
  for(const width of [320,375,430,768,1024,1440,1920]) await test(`categories:original-geometry-anchors:${width}`,async()=>{
    await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width,height:1000});await load('/portfolio.html');await page.mouse.move(0,0);
    const button=page.locator('#projectToolsToggle'),panel=page.locator('#projectTools');
    const expected=w=>({size:w<=768?50:60,inset:w<=480?15:w<=768?20:30,panel:w<=480?220:w<=768?250:280,font:w<=768?24:28});
    async function geometry(w,opened){
      const e=expected(w),data=await button.evaluate(el=>{
        const r=el.getBoundingClientRect(),span=el.querySelector('span'),sr=span.getBoundingClientRect(),range=document.createRange();range.selectNodeContents(span);const tr=range.getBoundingClientRect(),style=getComputedStyle(el);
        return {box:r.toJSON(),width:el.offsetWidth,height:el.offsetHeight,right:parseFloat(style.right),bottom:parseFloat(style.bottom),fontFamily:style.fontFamily,fontSize:parseFloat(style.fontSize),fontWeight:style.fontWeight,lineHeight:style.lineHeight,spanDelta:{x:sr.x+sr.width/2-r.x-r.width/2,y:sr.y+sr.height/2-r.y-r.height/2},textDelta:{x:tr.x+tr.width/2-r.x-r.width/2,y:tr.y+tr.height/2-r.y-r.height/2}};
      });
      assert.equal(data.width,e.size);assert.equal(data.height,e.size);assert.equal(data.right,e.inset);assert.equal(data.bottom,e.inset);
      assert.ok(data.fontFamily.startsWith('Arial'));assert.equal(data.fontSize,e.font);assert.equal(data.fontWeight,'300');assert.equal(data.lineHeight,'normal');
      if(!opened){assert.ok(Math.abs(data.box.x-(w-e.inset-e.size))<.1);assert.ok(Math.abs(data.box.y-(1000-e.inset-e.size))<.1);assert.ok(Math.abs(data.spanDelta.x)<.1&&Math.abs(data.spanDelta.y)<.1);assert.ok(Math.abs(data.textDelta.x)<.1&&Math.abs(data.textDelta.y+.5)<.1,'Original glyph Range center is half a CSS pixel above box center');}
      else {const box=await panel.boundingBox();assert.ok(Math.abs(box.width-e.panel)<.1);assert.ok(Math.abs(box.x+box.width-(w-e.inset))<.1);assert.ok(Math.abs(box.y+box.height-(1000-e.inset-e.size-10))<.1);assert.ok(box.x>=0&&box.y>=0);assert.equal(await panel.evaluate(el=>getComputedStyle(el).opacity),'1');}
      return data;
    }
    const closed=await geometry(width,false);metrics.push({categoryWidth:width,closed});
    if([375,1440].includes(width))await page.screenshot({path:path.join(out,`category-${width}-closed.png`),clip:{x:width-120,y:880,width:120,height:120}});
    await button.focus();await page.keyboard.press('Space');await page.mouse.move(0,0);
    assert.equal(await button.getAttribute('aria-expanded'),'true');assert.equal(await page.evaluate(()=>document.activeElement.id),'projectSearch');await geometry(width,true);
    await page.evaluate(()=>window.scrollTo(0,600));await geometry(width,true);
    const resized=width===1920?320:[320,375,430,768,1024,1440,1920].find(w=>w>width);await page.setViewportSize({width:resized,height:1000});await geometry(resized,true);
    await page.setViewportSize({width,height:1000});await geometry(width,true);
    if([375,1440].includes(width))await page.screenshot({path:path.join(out,`category-${width}-open.png`)});
    await page.keyboard.press('Escape');assert.equal(await button.getAttribute('aria-expanded'),'false');assert.ok(await button.evaluate(el=>el===document.activeElement));
    const anchors=await page.locator('.category-nav a').evaluateAll(es=>es.map(e=>e.hash));assert.deepEqual(anchors,catalogExpected.ids.map(id=>'#'+id));assert.deepEqual((await page.locator('.category-nav a').allTextContents()).map(x=>x.trim()),catalogExpected.nav_labels);
    for(const hash of anchors)assert.equal(await page.locator(hash).count(),1,'Every category target exists');
    for(const hash of [anchors[0],anchors[anchors.length-1]]){
      await button.focus();await page.keyboard.press('Enter');await page.locator(`.category-nav a[href="${hash}"]`).click();
      assert.equal(await page.evaluate(()=>document.activeElement.id),hash.slice(1));assert.ok(await panel.isHidden());
      const target=await page.locator(hash).boundingBox(),header=await page.locator('header').boundingBox();assert.ok(target.y>=header.y+header.height-1&&target.y<1000,'Category heading is visible below fixed header');
    }
    await layout();
  });
  const contentManifest=JSON.parse(fs.readFileSync(path.join(root,'docs/content-manifest.json'),'utf8'));
  await test('content06:all-76-descriptions-manifest-native-and-modal',async()=>{
    await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:1440,height:1000});await load('/portfolio.html');
    assert.equal(contentManifest.projects.length,76);assert.equal(new Set(contentManifest.projects.map(p=>p.description.trim())).size,76);
    for(const project of contentManifest.projects){
      const card=page.locator(`#${project.id}`);assert.equal(await card.getAttribute('data-description'),project.description);
      assert.equal((await card.locator('.project-summary').textContent()).trim(),project.description);
      assert.ok(project.description.trim().length>0,`${project.id}: nonempty individual description`);
      assert.deepEqual(JSON.parse(await card.getAttribute('data-media')),project.media);
      await card.locator('.project-open').first().click();await page.locator('#portfolioModal').waitFor({state:'visible'});
      assert.equal((await page.locator('#projectDescription').textContent()).trim(),project.description);
      assert.equal((await page.locator('#portfolio-modal-title').textContent()).trim(),project.title);
      assert.ok(await page.locator('#projectDescription').evaluate(e=>!!(e.compareDocumentPosition(document.querySelector('#galleryContent'))&Node.DOCUMENT_POSITION_FOLLOWING)),'Description must precede project media');
      await page.keyboard.press('Escape');await page.locator('#portfolioModal').waitFor({state:'hidden'});
    }
    assert.equal(await page.locator('.project-files a').count(),211);
  });
  await test('content06:no-JS-76-descriptions-211-media',async()=>{
    const context=await browser.newContext({javaScriptEnabled:false,reducedMotion:'reduce',viewport:{width:375,height:1000}});
    try{const probe=await context.newPage();observeErrors(probe);await probe.goto(base+'/portfolio.html',{waitUntil:'networkidle'});await probe.evaluate(()=>document.fonts.ready);
      for(const project of contentManifest.projects){const card=probe.locator(`#${project.id}`);await card.locator('summary').click();assert.ok(await card.locator('.project-summary').isVisible());assert.equal((await card.locator('.project-summary').textContent()).trim(),project.description);}
      assert.equal(await probe.locator('.project-files a:visible').count(),211);await layout(probe);
    }finally{await context.close()}
  });
  for(const width of [320,375,430,768,1024,1440,1920])await test(`content06:privacy-factual-local-only:${width}`,async()=>{
    const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});
    try{const probe=await context.newPage();observeErrors(probe);const external=[],requests=[];
      probe.on('request',r=>{requests.push({url:r.url(),method:r.method()});if(!r.url().startsWith(base)&&!r.url().startsWith('data:'))external.push(r.url())});
      for(const route of ['/','/portfolio.html','/services.html','/404.html']){
        await probe.goto(base+route,{waitUntil:'networkidle'});await probe.locator('#openPrivacy').click();await probe.locator('#privacyModal').waitFor({state:'visible'});
        const policy=probe.locator('#privacyModal .privacy-policy');assert.ok(await policy.isVisible());
        assert.deepEqual(await policy.locator('h3').allTextContents(),['Просмотр сайта и поиск','Cookies, хранилище и аналитика','Изображения, видео и шрифты','Хостинг GitHub Pages','Внешние ссылки','Вопросы о конфиденциальности']);
        assert.ok(await policy.locator('a[href="https://t.me/Ded_Timon"]').count());
        const text=await policy.innerText();for(const word of ['GitHub Pages','Telegram','WhatsApp','YouTube','IP'])assert.ok(text.includes(word),word);
        assert.equal(await probe.locator('form,iframe').count(),0);
        assert.deepEqual(await probe.evaluate(()=>({cookies:document.cookie,local:localStorage.length,session:sessionStorage.length})),{cookies:'',local:0,session:0});
        const geometry=await probe.locator('#privacyModal .modal-content').evaluate(el=>{
          const r=el.getBoundingClientRect(),close=el.querySelector('.close-modal').getBoundingClientRect(),heading=el.querySelector('h2'),range=document.createRange();range.selectNodeContents(heading);
          const glyphs=[...range.getClientRects()].map(r=>r.toJSON()),style=getComputedStyle(el.querySelector('.privacy-policy'));
          const overflow=[...el.querySelectorAll('.privacy-policy p,.privacy-policy a,.privacy-policy h3')].map(e=>e.getBoundingClientRect()).filter(x=>x.left<r.left-1||x.right>r.right+1).length;
          return{box:r.toJSON(),close:close.toJSON(),glyphs,scrollWidth:el.scrollWidth,clientWidth:el.clientWidth,font:parseFloat(style.fontSize),line:parseFloat(style.lineHeight),overflow};
        });
        assert.ok(geometry.box.x>=0&&geometry.box.x+geometry.box.width<=width+1);assert.ok(geometry.scrollWidth<=geometry.clientWidth+1);assert.equal(geometry.overflow,0);
        assert.ok(geometry.close.width>=44&&geometry.close.height>=44);assert.ok(geometry.font>=16&&geometry.line>=24);
        assert.ok(geometry.glyphs.every(r=>r.right<=geometry.close.x||r.x>=geometry.close.right||r.bottom<=geometry.close.y||r.y>=geometry.close.bottom),'Privacy heading glyphs must not overlap close control');
        const contact=policy.locator('a[href="https://t.me/Ded_Timon"]');await contact.focus();
        assert.ok(await contact.evaluate(e=>e===document.activeElement));
        const contactBox=await contact.boundingBox();assert.ok(contactBox.y>=geometry.box.y&&contactBox.y+contactBox.height<=geometry.box.y+geometry.box.height+1,'Contact must scroll into view and receive focus');
        await a11y(probe);
        if(route==='/')await probe.screenshot({path:path.join(out,`privacy-content-${width}.png`)});
        await probe.keyboard.press('Escape');await probe.locator('#privacyModal').waitFor({state:'hidden'});assert.equal(await probe.evaluate(()=>document.activeElement.id),'openPrivacy');
        if(route==='/portfolio.html'){await probe.locator('#projectToolsToggle').click();await probe.locator('#projectSearch').fill('content06-private-local-query');await probe.waitForTimeout(100);await probe.keyboard.press('Escape');}
      }
      assert.ok(requests.every(r=>['GET','HEAD'].includes(r.method)&&!r.url.includes('content06-private-local-query')),'No submission or search query request');
      assert.deepEqual(external,[],'Viewing the site/policy must not call external services');
    }finally{await context.close()}
  });
  for(const width of [320,375,430,768,1024,1440,1920])for(const via of ['X','Escape','outside'])await test(`content06:close-centered:${width}:${via}`,async()=>{
    const probe=await browser.newPage({viewport:{width,height:1000},reducedMotion:'no-preference'});observeErrors(probe);
    try{await content06Open(probe,'work-01');const result=await content06Close(probe,via,`close-${width}-${via}`);assert.equal(result.final.focus,'work-01');}
    finally{await probe.close()}
  });
  for(const width of [375,1440])for(const scenario of ['portrait','video','long-text','scrolled'])await test(`content06:close-media:${width}:${scenario}`,async()=>{
    const longest=contentManifest.projects.reduce((a,b)=>a.description.length>b.description.length?a:b).id;
    const project=scenario==='portrait'?'work-02':scenario==='video'?'work-08':longest;
    const probe=await browser.newPage({viewport:{width,height:scenario==='scrolled'?500:1000},reducedMotion:'no-preference'});observeErrors(probe);
    try{
      await content06Open(probe,project,{video:scenario==='video',scroll:scenario==='scrolled'});
      if(scenario==='portrait')assert.ok(await probe.locator('#galleryContent img').evaluate(i=>i.naturalHeight>i.naturalWidth));
      if(scenario==='long-text'){assert.equal((await probe.locator('#projectDescription').textContent()).trim(),contentManifest.projects.find(p=>p.id===project).description);await probe.screenshot({path:path.join(out,`description-viewer-${width}.png`)});}
      const result=await content06Close(probe,scenario==='scrolled'?'Escape':scenario==='video'?'X':'outside',`close-${width}-${scenario}`);assert.equal(result.final.focus,project);
    }finally{await probe.close()}
  });
  for(const width of [375,1440])await test(`content06:reopen-race-and-focus:${width}`,async()=>{
    const probe=await browser.newPage({viewport:{width,height:1000},reducedMotion:'no-preference'});observeErrors(probe);
    try{
      await content06Open(probe,'work-01');
      await probe.evaluate(()=>{window.__closedEvents=0;document.querySelector('#portfolioModal').addEventListener('site:modalclosed',()=>window.__closedEvents++);document.querySelector('#closePortfolioModal').click();setTimeout(()=>document.querySelector('#work-02 .project-open').click(),80)});
      await probe.waitForTimeout(650);assert.equal(await probe.locator('#portfolioModal').getAttribute('aria-hidden'),'false');
      assert.equal((await probe.locator('#portfolio-modal-title').textContent()).trim(),contentManifest.projects.find(p=>p.id==='work-02').title);
      assert.ok(await probe.locator('#galleryContent img').count());assert.equal(await probe.evaluate(()=>window.__closedEvents),0,'Stale closing callback must not hide/clear reopened dialog');
      assert.ok(await probe.evaluate(()=>document.body.style.overflow==='hidden'&&document.querySelector('main').inert));
      await probe.keyboard.press('Tab');assert.ok(await probe.evaluate(()=>!!document.activeElement.closest('#portfolioModal')));
      await content06Close(probe,'Escape',`close-${width}-reopened`);assert.ok(await probe.locator('#work-02 .project-open').first().evaluate(e=>e===document.activeElement));
      assert.equal(await probe.evaluate(()=>window.__closedEvents),1);
    }finally{await probe.close()}
  });
  for(const width of [375,1440])await test(`content06:reduced-motion-close:${width}`,async()=>{
    const probe=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'});observeErrors(probe);
    try{for(const via of ['X','Escape','outside']){await content06Open(probe,'work-01');const result=await content06Close(probe,via,`reduced-${width}-${via}`,{reduced:true});assert.equal(result.final.focus,'work-01');}}
    finally{await probe.close()}
  });

  const catalogManifest=JSON.parse(fs.readFileSync(path.join(root,'docs/content-manifest.json'),'utf8'));
  await test('catalog07:all76-modal-content-without-software',async()=>{
    await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:1440,height:1000});await load('/portfolio.html');
    const order=await catalog07Order();assert.deepEqual(order,catalogExpected.order);assert.equal(catalogManifest.projects.length,76);
    for(const project of catalogManifest.projects){
      const card=page.locator(`#${project.id}`),opener=card.locator('.project-open').first();
      assert.equal(await card.getAttribute('data-description'),project.description);assert.deepEqual(JSON.parse(await card.getAttribute('data-media')),project.media);
      await opener.click();await page.locator('#portfolioModal').waitFor({state:'visible'});
      await catalog07NoSoftware();assert.equal((await page.locator('#portfolio-modal-title').textContent()).trim(),project.title);assert.equal((await page.locator('#projectDescription').textContent()).trim(),project.description);
      if(['work-49','work-76'].includes(project.id)){
        const expected=project.id==='work-49'?'Процедурный город':'СкрруджМакДак AI иллюстрация';
        assert.equal(project.title,expected);assert.ok((await card.locator('img:not([aria-hidden="true"])').first().getAttribute('alt')).includes(expected));
        assert.ok((await page.locator('#galleryContent img').getAttribute('alt')).includes(expected));
        await page.locator('#galleryContent img').evaluate(i=>i.decode());await page.screenshot({path:path.join(out,`catalog-${project.id}-modal-1440.png`)});
      }
      await page.keyboard.press('Escape');await page.locator('#portfolioModal').waitFor({state:'hidden'});assert.ok(await opener.evaluate(e=>e===document.activeElement));
      assert.deepEqual(await catalog07Order(),order,'Opening/closing must not reorder section cards');
    }
    assert.equal(await page.locator('.project-files a').count(),211);
  });
  await test('catalog07:no-JS-native-descriptions-media-order',async()=>{
    const context=await browser.newContext({javaScriptEnabled:false,reducedMotion:'reduce',viewport:{width:375,height:1000}});
    try{const probe=await context.newPage();observeErrors(probe);await probe.goto(base+'/portfolio.html',{waitUntil:'networkidle'});await probe.evaluate(()=>document.fonts.ready);await catalog07NoSoftware(probe);assert.deepEqual(await catalog07Order(probe),catalogExpected.order);
      for(const project of catalogManifest.projects){const card=probe.locator(`#${project.id}`);await card.locator('summary').click();assert.ok(await card.locator('.project-summary').isVisible());assert.equal((await card.locator('.project-summary').textContent()).trim(),project.description);assert.equal((await card.locator('.portfolio-title').textContent()).trim(),project.title);}
      await catalog07NoSoftware(probe);assert.equal(await probe.locator('.project-files a:visible').count(),211);assert.equal(await probe.locator('#ai-title,.category-nav a[href="#ai-title"]').count(),0);await layout(probe);
    }finally{await context.close()}
  });
  for(const width of [320,375,430,768,1024,1440,1920])await test(`catalog07:sections-anchors-order-layout:${width}`,async()=>{
    await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width,height:1000});await load('/portfolio.html');await catalog07NoSoftware();await layout();
    assert.deepEqual(await catalog07Order(),catalogExpected.order);
    assert.deepEqual((await page.locator('.portfolio-category-section h2').allTextContents()).map(x=>x.trim()),catalogExpected.labels);
    assert.equal(await page.locator('#ai-title,.category-nav a[href="#ai-title"]').count(),0);
    assert.equal(await page.locator('#work-74').evaluate(e=>e.closest('section').getAttribute('aria-labelledby')),'motion-title');
    for(const id of ['work-75','work-76'])assert.equal(await page.locator(`#${id}`).evaluate(e=>e.closest('section').getAttribute('aria-labelledby')),'logos-title');
    const toggle=page.locator('#projectToolsToggle');await toggle.click();
    assert.deepEqual(await page.locator('.category-nav a').evaluateAll(es=>es.map(e=>({id:e.hash.slice(1),label:e.textContent.trim()}))),catalogExpected.ids.map((id,i)=>({id,label:catalogExpected.nav_labels[i]})));
    await page.locator('.category-nav a[href="#scenes-title"]').click();assert.equal(await page.evaluate(()=>document.activeElement.id),'scenes-title');
    const section=await page.locator('#scenes-title').boundingBox();assert.ok(section.y>=0&&section.y<1000);assert.deepEqual(await catalog07Order(),catalogExpected.order);
    await toggle.click();await page.locator('.category-nav a[href="#logos-title"]').click();assert.equal(await page.evaluate(()=>document.activeElement.id),'logos-title');
    if([375,1440].includes(width)){await a11y();await page.screenshot({path:path.join(out,`catalog-${width}.png`)});}
  });
  for(const width of [375,1440])await test(`catalog07:search-clear-modal-preserves-section-order:${width}`,async()=>{
    await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width,height:1000});await load('/portfolio.html');
    const toggle=page.locator('#projectToolsToggle'),input=page.locator('#projectSearch');await toggle.click();assert.equal(await input.getAttribute('placeholder'),'Название или описание');
    await input.fill('СкрруджМакДак AI иллюстрация');assert.deepEqual(await page.locator('.portfolio-card:not([hidden])').evaluateAll(es=>es.map(e=>e.id)),['work-76']);
    await page.keyboard.press('Escape');const opener=page.locator('#work-76 .project-open').first();await opener.click();assert.equal((await page.locator('#portfolio-modal-title').textContent()).trim(),'СкрруджМакДак AI иллюстрация');
    await page.locator('#galleryContent img').evaluate(i=>i.decode());await page.screenshot({path:path.join(out,`catalog-renamed-modal-${width}.png`)});await page.keyboard.press('Escape');await page.locator('#portfolioModal').waitFor({state:'hidden'});assert.ok(await opener.evaluate(e=>e===document.activeElement));assert.deepEqual(await catalog07Order(),catalogExpected.order);
    await toggle.click();await input.fill('сцен');
    const subsets=await page.locator('.portfolio-category-section').evaluateAll(es=>Object.fromEntries(es.map(e=>[e.getAttribute('aria-labelledby'),[...e.querySelectorAll('.portfolio-card:not([hidden])')].map(c=>c.id)])));
    assert.ok(Object.values(subsets).flat().length>1);for(const [id,actual] of Object.entries(subsets))assert.deepEqual(actual,catalogExpected.order[id].filter(x=>actual.includes(x)),'Search subset retains date/tie order');
    await input.fill('Geometry Nodes');assert.equal(await page.locator('.portfolio-card:not([hidden])').count(),0,'Removed software text must not remain in search index');
    await input.fill('Процедурный город');assert.deepEqual(await page.locator('.portfolio-card:not([hidden])').evaluateAll(es=>es.map(e=>e.id)),['work-49']);
    await input.fill('');assert.equal(await page.locator('.portfolio-card:not([hidden])').count(),76);assert.equal(await page.locator('.portfolio-category-section:not([hidden])').count(),6);assert.deepEqual(await catalog07Order(),catalogExpected.order);await page.keyboard.press('Escape');await layout();
  });

  for(const width of [320,375,430,768,1024,1440,1920])await test(`closeTitle08:hover-unhover-click-geometry:${width}`,async()=>{
    const probe=await browser.newPage({viewport:{width,height:1000},reducedMotion:'no-preference'});observeErrors(probe);
    try{await content06Open(probe,'work-01');assert.equal(await probe.title(),'DedTimon');await closeTitle08Probe(probe,`button-${width}`,{screenshot:[375,1440].includes(width)});assert.ok(await probe.locator('#work-01 .project-open').first().evaluate(e=>e===document.activeElement));assert.equal(await probe.title(),'DedTimon');}finally{await probe.close()}
  });
  for(const width of [375,1440])for(const scenario of ['portrait','video','long-scroll'])await test(`closeTitle08:varied-media:${width}:${scenario}`,async()=>{
    const longest=contentManifest.projects.reduce((a,b)=>a.description.length>b.description.length?a:b).id;
    const project=scenario==='portrait'?'work-02':scenario==='video'?'work-08':longest;
    const probe=await browser.newPage({viewport:{width,height:scenario==='long-scroll'?500:1000},reducedMotion:'no-preference'});observeErrors(probe);
    try{await content06Open(probe,project,{video:scenario==='video',scroll:scenario==='long-scroll'});await closeTitle08Probe(probe,`button-${width}-${scenario}`);assert.ok(await probe.locator(`#${project} .project-open`).first().evaluate(e=>e===document.activeElement));}finally{await probe.close()}
  });
  for(const width of [375,1440])await test(`closeTitle08:reduced-motion-and-keyboard:${width}`,async()=>{
    const probe=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'});observeErrors(probe);
    try{const opener=await content06Open(probe,'work-01');await closeTitle08Probe(probe,`button-${width}-reduced`,{reduced:true});await opener.focus();await probe.keyboard.press('Enter');await probe.locator('#portfolioModal').waitFor({state:'visible'});const close=probe.locator('#closePortfolioModal');assert.ok(await close.evaluate(e=>e===document.activeElement));assert.equal(await close.getAttribute('aria-label'),'Закрыть окно');assert.equal(await close.locator('svg').getAttribute('aria-hidden'),'true');assert.equal(await close.locator('svg').getAttribute('focusable'),'false');await probe.keyboard.press('Tab');await probe.keyboard.press('Shift+Tab');assert.ok(await close.evaluate(e=>e===document.activeElement));assert.equal(await close.locator('svg').evaluate(e=>getComputedStyle(e).transform),'none');await probe.keyboard.press('Enter');await probe.locator('#portfolioModal').waitFor({state:'hidden'});assert.ok(await opener.evaluate(e=>e===document.activeElement));}finally{await probe.close()}
  });
  await test('closeTitle08:document-title-four-routes-and-interactions',async()=>{
    await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:375,height:1000});
    for(const route of ['/','/portfolio.html','/services.html','/404.html']){await page.goto(base+route,{waitUntil:'networkidle'});assert.equal(await page.title(),'DedTimon');assert.equal(await page.locator('title').count(),1);}
    await load('/portfolio.html');await page.locator('#projectToolsToggle').click();await page.locator('#projectSearch').fill('СкрруджМакДак');assert.equal(await page.title(),'DedTimon');await page.keyboard.press('Escape');await page.locator('#work-76 .project-open').first().click();await page.locator('#portfolioModal').waitFor({state:'visible'});assert.equal(await page.title(),'DedTimon');await page.keyboard.press('Escape');await page.locator('#portfolioModal').waitFor({state:'hidden'});assert.equal(await page.title(),'DedTimon');await page.locator('#projectToolsToggle').click();await page.locator('#projectSearch').fill('');await page.locator('.category-nav a[href="#scenes-title"]').click();assert.equal(await page.title(),'DedTimon');assert.equal(await page.evaluate(()=>location.hash),'#scenes-title');
  });
  await test('closeTitle08:no-JS-document-title-four-routes',async()=>{
    const context=await browser.newContext({javaScriptEnabled:false,reducedMotion:'reduce',viewport:{width:375,height:1000}});
    try{const probe=await context.newPage();observeErrors(probe);for(const route of ['/','/portfolio.html','/services.html','/404.html']){await probe.goto(base+route);assert.equal(await probe.title(),'DedTimon');assert.equal(await probe.locator('title').count(),1);}}finally{await context.close()}
  });

  await test('closeTitle08:layout-seven-widths',async()=>{
    await page.emulateMedia({reducedMotion:'reduce'});
    for(const width of [320,375,430,768,1024,1440,1920]){
      await page.setViewportSize({width,height:1000});await content06Open(page,'work-76');await layout();
      const geometry=await page.locator('.portfolio-modal-content').evaluate(el=>({box:el.getBoundingClientRect().toJSON(),scrollWidth:el.scrollWidth,clientWidth:el.clientWidth}));assert.ok(geometry.box.x>=0&&geometry.box.x+geometry.box.width<=width+1);assert.ok(geometry.scrollWidth<=geometry.clientWidth+1,'Modal must not scroll horizontally');
      const close=await page.locator('#closePortfolioModal').boundingBox();assert.ok(close.x>=geometry.box.x&&close.x+close.width<=geometry.box.x+geometry.box.width&&close.y>=geometry.box.y);
      if([375,1440].includes(width))await page.screenshot({path:path.join(out,`close-title-modal-${width}.png`)});
      await page.keyboard.press('Escape');await page.locator('#portfolioModal').waitFor({state:'hidden'});
    }
  });
  await test('runtime:no-console-errors',async()=>assert.deepEqual(errors.filter(e=>!e.includes('404 (Not Found)')),[]));
})().catch(error=>{checks.push({name:'harness',status:'FAIL',reason:error.stack});}).finally(async()=>{
  if (checks.some(c=>c.status==='FAIL') && page && !page.isClosed()) await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});
  if(browser)await browser.close(); await new Promise(resolve=>instance.close(resolve));
  let revision='unavailable';try{revision=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();}catch{}
  const hashes={};for(const name of ['index.html','portfolio.html','services.html','scripts.js','styles.css','docs/content-manifest.json','404.html','tests/browser.cjs','pnpm-lock.yaml'])if(fs.existsSync(path.join(root,name)))hashes[name]=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,name))).digest('hex');
  const result={status:checks.length&&checks.every(c=>c.status==='PASS')?'PASS':'FAIL',revision,environment:{node:process.version,os:process.platform,architecture:process.arch,playwright:require('playwright/package.json').version,axe:require('axe-core/package.json').version,reducedMotion:'reduce'},checks,metrics,console:errors,source_hashes:hashes};
  fs.writeFileSync(path.join(out,only?'browser-targeted.json':'browser.json'),JSON.stringify(result,null,2));
  console.log(JSON.stringify({status:result.status,passed:checks.filter(c=>c.status==='PASS').length,failed:checks.filter(c=>c.status==='FAIL'),metrics}));
  process.exitCode=result.status==='PASS'?0:1;
});
