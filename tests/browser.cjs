'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { chromium } = require('playwright');
const { server } = require('../tools/serve.cjs');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'test-results');
fs.mkdirSync(out, { recursive: true });
const checks = []; const errors = []; const metrics = [];
const only = process.env.TEST_ONLY || '';
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
async function layout() {
  const result = await page.evaluate(() => {
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
async function a11y() {
  await page.addScriptTag({ path: axeSource });
  const result = await page.evaluate(async () => {
    const result = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } });
    return { violations: result.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(n => ({ target: n.target, reason: n.failureSummary })) })), incomplete: result.incomplete.map(v => v.id) };
  });
  assert.deepEqual(result.violations, [], JSON.stringify(result.violations));
  return result;
}
(async () => {
  await new Promise(resolve => instance.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${instance.address().port}`;
  browser = await chromium.launch({ headless: true });
  page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('response', response => { if (response.status() >= 400 && response.url().startsWith(base) && !response.url().includes('intentional-404')) errors.push(`${response.status()} ${response.url().replace(base, '')}`); });
  for (const width of [320, 375, 430, 768, 1024, 1440, 1920]) {
    for (const route of ['/', '/portfolio.html', '/services.html']) {
      await test(`responsive:${width}:${route}`, async () => {
        await page.setViewportSize({ width, height: 1000 }); await load(route); await layout();
        await page.screenshot({ path: path.join(out, `view-${width}-${route === '/' ? 'home' : route.slice(1,-5)}.png`), fullPage: route !== '/portfolio.html' });
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
  for (const route of ['/', '/portfolio.html', '/services.html']) {
    await test(`accessibility:${route}`, async () => {
      await page.setViewportSize({ width: 1440, height: 1000 }); await load(route); await a11y();
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
    const summary=page.locator('.project-files summary').first(); await summary.click();
    assert.ok(await page.locator('.project-files').first().evaluate(el=>el.open));
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
    await load('/portfolio.html'); const input=page.locator('#projectSearch'); await input.fill('сакурой');
    await page.waitForFunction(()=>[...document.querySelectorAll('.portfolio-card')].filter(c=>!c.hidden).length===1);
    await input.fill('zzzzzz-nothing'); await page.waitForFunction(()=>[...document.querySelectorAll('.portfolio-card')].every(c=>c.hidden));
    assert.ok((await page.locator('#searchStatus').textContent()).length>0);
    await input.fill(''); await page.waitForFunction(()=>[...document.querySelectorAll('.portfolio-card')].filter(c=>!c.hidden).length===76);
  });
  await test('privacy:dialog+return-focus', async () => {
    await load('/'); await page.locator('#openPrivacy').click(); await page.locator('#privacyModal').waitFor({state:'visible'});
    await a11y(); await page.keyboard.press('Escape'); await page.locator('#privacyModal').waitFor({state:'hidden'});
    assert.equal(await page.evaluate(()=>document.activeElement.id),'openPrivacy');
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
    const context=await browser.newContext({javaScriptEnabled:false,viewport:{width:375,height:900}});
    const fallback=await context.newPage(); await fallback.goto(base+'/portfolio.html');
    assert.equal(await fallback.locator('.portfolio-card').count(),76);
    assert.equal(await fallback.locator('.project-summary:visible').count(),76);
    assert.ok(await fallback.getByRole('navigation',{name:'Основная навигация'}).isVisible());
    await fallback.locator('.project-files summary').first().click();
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
  await test('runtime:no-console-errors',async()=>assert.deepEqual(errors.filter(e=>!e.includes('404 (Not Found)')),[]));
})().catch(error=>{checks.push({name:'harness',status:'FAIL',reason:error.stack});}).finally(async()=>{
  if (checks.some(c=>c.status==='FAIL') && page && !page.isClosed()) await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});
  if(browser)await browser.close(); await new Promise(resolve=>instance.close(resolve));
  let revision='unavailable';try{revision=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();}catch{}
  const hashes={};for(const name of ['index.html','portfolio.html','services.html','scripts.js','styles.css','tests/browser.cjs','pnpm-lock.yaml'])if(fs.existsSync(path.join(root,name)))hashes[name]=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,name))).digest('hex');
  const result={status:checks.length&&checks.every(c=>c.status==='PASS')?'PASS':'FAIL',revision,environment:{node:process.version,os:process.platform,architecture:process.arch,playwright:require('playwright/package.json').version,axe:require('axe-core/package.json').version,reducedMotion:'reduce'},checks,metrics,console:errors,source_hashes:hashes};
  fs.writeFileSync(path.join(out,only?'browser-targeted.json':'browser.json'),JSON.stringify(result,null,2));
  console.log(JSON.stringify({status:result.status,passed:checks.filter(c=>c.status==='PASS').length,failed:checks.filter(c=>c.status==='FAIL'),metrics}));
  process.exitCode=result.status==='PASS'?0:1;
});
