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
    assert.equal(await fallback.locator('.project-files summary:visible').count(),76);
    for (const summary of await fallback.locator('.project-files summary').all()) await summary.click();
    assert.equal(await fallback.locator('.project-summary:visible').count(),76);
    assert.equal(await fallback.locator('.project-tech:visible').count(),76);
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
  await test('motion:original-timing-autoplay-pause-and-swipe', async () => {
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
    await page.locator('.motion-toggle').click();assert.equal(await page.locator('.motion-toggle').getAttribute('aria-pressed'),'true');
    assert.equal(await page.locator('.hero-title').evaluate(e=>getComputedStyle(e).animationPlayState),'paused');
    await page.locator('#carousel').scrollIntoViewIfNeeded();await page.mouse.move(0,0);const paused=await current().getAttribute('data-index');await page.waitForTimeout(4200);assert.equal(await current().getAttribute('data-index'),paused);
    await page.emulateMedia({reducedMotion:'reduce'});await page.locator('.motion-toggle').waitFor({state:'hidden'});
    assert.equal(await page.locator('.hero-title').evaluate(e=>getComputedStyle(e).animationName),'none');
    const beforeSwipe=await current().getAttribute('data-index');
    const box=await page.locator('#carousel').boundingBox();const cdp=await page.context().newCDPSession(page);const x=Math.round(box.x+box.width/2),y=Math.round(box.y+box.height/2);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:x+80,y}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x-80,y}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();
    assert.notEqual(await current().getAttribute('data-index'),beforeSwipe);
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
    await page.waitForTimeout(550);assert.equal(await page.locator('.blue-particle').count(),0,'Particles must not keep an idle loop alive');
    await page.emulateMedia({reducedMotion:'reduce'});await page.mouse.move(450,230);assert.equal(await page.locator('.blue-particle').count(),0);
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
