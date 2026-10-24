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
const themes = ['dark', 'light'];
const themeKey = 'dedtimon-theme';
function observeErrors(target) {
  target.on('pageerror', error => errors.push(error.message));
  target.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  target.on('response', response => { if (response.status() >= 400 && response.url().startsWith(base) && !response.url().includes('intentional-404')) errors.push(`${response.status()} ${response.url().replace(base, '')}`); });
}
async function assertTheme(theme, target = page) {
  await target.waitForFunction(expected => document.documentElement.dataset.theme === expected, theme);
  const button = target.locator('.theme-toggle');
  assert.equal(await button.count(), 1, 'Exactly one compact theme control');
  assert.ok(await button.isVisible());
  assert.equal(await button.getAttribute('aria-label'), 'Светлая тема');
  assert.equal(await button.getAttribute('aria-pressed'), String(theme === 'light'));
}
async function chooseTheme(theme, target = page) {
  if (await target.locator('html').getAttribute('data-theme') !== theme) await target.locator('.theme-toggle').click();
  await assertTheme(theme, target);
}
async function themeTest(name, run) {
  for (const theme of themes) await test(`${name}:${theme}`, async () => {
    await load('/'); await chooseTheme(theme); await run(theme); await assertTheme(theme);
  });
}
(async () => {
  await new Promise(resolve => instance.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${instance.address().port}`;
  browser = await chromium.launch({ headless: true });
  page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  observeErrors(page);
  for (const theme of themes) for (const width of [320, 375, 430, 768, 1024, 1440, 1920]) {
    for (const route of ['/', '/portfolio.html', '/services.html']) {
      await test(`responsive:${theme}:${width}:${route}`, async () => {
        await page.setViewportSize({ width, height: 1000 }); await load(route); await chooseTheme(theme); await layout();

        await page.screenshot({ path: path.join(out, `view-${theme}-${width}-${route === '/' ? 'home' : route.slice(1,-5)}.png`), fullPage: route !== '/portfolio.html' });
        assert.equal(await page.locator('.motion-toggle').count(), 0);
        assert.ok(!/©|Возобновить анимации|Приостановить анимации/.test(await page.locator('footer').innerText()));
        const themeBox=await page.locator('.theme-toggle').boundingBox(); assert.ok(themeBox.width>=44&&themeBox.height>=44&&themeBox.x>=0&&themeBox.x+themeBox.width<=width);
        if ([375,1440].includes(width)) await page.screenshot({path:path.join(out,`viewport-${theme}-${width}-${route==='/'?'home':route.slice(1,-5)}.png`)});
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
    await themeTest(`accessibility:${width}:${route}`, async () => {
      await page.setViewportSize({ width, height: 1000 }); await load(route); await a11y();
    });
  }
  await themeTest('keyboard:skip-link+visible-focus', async () => {
    await load('/'); await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.className), 'skip-link');
    const box=await page.locator('.skip-link').boundingBox(); assert.ok(box.y >= 0, 'Focused skip-link offscreen: '+JSON.stringify(box));
    await page.keyboard.press('Enter'); assert.equal(await page.evaluate(() => document.activeElement.id), 'main-content');
  });
  await themeTest('gallery:keyboard+focus+native-files', async () => {
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
  await themeTest('gallery:real-video-playback+cleanup', async () => {
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
  await themeTest('portfolio:search+zero-results+reset', async () => {
    await load('/portfolio.html'); await page.locator('#projectToolsToggle').click(); const input=page.locator('#projectSearch'); await input.fill('сакурой');
    await page.waitForFunction(()=>[...document.querySelectorAll('.portfolio-card')].filter(c=>!c.hidden).length===1);
    await input.fill('zzzzzz-nothing'); await page.waitForFunction(()=>[...document.querySelectorAll('.portfolio-card')].every(c=>c.hidden));
    assert.ok((await page.locator('#searchStatus').textContent()).length>0);
    await input.fill(''); await page.waitForFunction(()=>[...document.querySelectorAll('.portfolio-card')].filter(c=>!c.hidden).length===76);
  });
  await themeTest('privacy:dialog+return-focus', async () => {
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
  await themeTest('text-zoom:200-percent-mobile', async () => {
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
  await themeTest('identity:home-composition+carousel-keyboard', async () => {
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
  await themeTest('identity:mobile-carousel+tools-focus', async () => {
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
  await themeTest('identity:original-mobile-card-alignment+disclosure', async () => {
    for (const width of [320,375,430,768]) {
      await page.setViewportSize({width,height:1000}); await load('/portfolio.html');
      const card=page.locator('.portfolio-card').first();
      for (const selector of ['.portfolio-title','.portfolio-date']) assert.equal(await card.locator(selector).evaluate(e=>getComputedStyle(e).textAlign),'right');
      assert.equal(await card.locator('.project-summary').isVisible(),false);
      await card.locator('.project-open').first().focus();await page.keyboard.press('Enter');await page.locator('#portfolioModal').waitFor({state:'visible'});
      assert.ok(await page.locator('#projectDescription').isVisible());await page.keyboard.press('Escape');await layout();
    }
  });
  await themeTest('identity:compact-gallery-natural-aspect+mobile-controls', async (theme) => {
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
      if ([375,1440].includes(width)) { await page.locator('.portfolio-modal-content').evaluate(e=>e.scrollTop=0); await page.screenshot({path:path.join(out,`gallery-${theme}-${width}.png`)}); }
      await page.keyboard.press('Escape');
    }
  });
  await themeTest('identity:reduced-motion-and-normal-motion', async () => {
    await page.setViewportSize({width:1440,height:1000}); await page.emulateMedia({reducedMotion:'no-preference'}); await load('/');
    const animations=await page.locator('.logo-img,.hero-title,.accent').evaluateAll(es=>es.map(e=>({name:getComputedStyle(e).animationName,count:getComputedStyle(e).animationIterationCount})));
    assert.ok(animations.some(x=>x.name!=='none'));assert.ok(animations.every(x=>x.count==='infinite'));
    await page.emulateMedia({reducedMotion:'reduce'});
    assert.ok(await page.locator('.logo-img,.hero-title,.accent').evaluateAll(es=>es.every(e=>getComputedStyle(e).animationName==='none')));
    await page.locator('.carousel-controls .next').click();
    assert.equal(await page.locator('.carousel-item[data-position="current"]').getAttribute('data-index'),'1');
  });
  await themeTest('theme:focus-contrast', async () => {
    for (const width of [375,1440]) for (const route of ['/','/portfolio.html','/services.html']) {
      await page.setViewportSize({width,height:1000});await load(route);
      for (const selector of ['.brand','.theme-toggle',route==='/'?'.section-button':route==='/services.html'?'.clickable-card':'.portfolio-title a']) {
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
  await themeTest('motion:original-timing-autoplay-reduced-motion-and-swipe', async () => {
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
  await themeTest('motion:original-carousel-hidden-trajectory', async () => {
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
  await themeTest('motion:original-hover-reveal-and-pointer-cleanup', async () => {
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
  await themeTest('motion:reduced-panels-navigation-and-gallery-remain-visible', async () => {
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
  await test('theme:persistence-reload-navigation-and-new-tab', async () => {
    const context=await browser.newContext({viewport:{width:375,height:1000},colorScheme:'dark',reducedMotion:'reduce'});
    try {
      const probe=await context.newPage();observeErrors(probe);await probe.goto(base+'/');await assertTheme('dark',probe);
      await probe.locator('.theme-toggle').click();await assertTheme('light',probe);
      assert.equal(await probe.evaluate(key=>localStorage.getItem(key),themeKey),'light');
      await probe.reload();await assertTheme('light',probe);
      for(const route of ['/portfolio.html','/services.html']){await probe.goto(base+route);await assertTheme('light',probe);}
      const second=await context.newPage();observeErrors(second);await second.goto(base+'/');await assertTheme('light',second);
      await probe.emulateMedia({colorScheme:'dark'});await assertTheme('light',probe);
      await probe.locator('.theme-toggle').click();await assertTheme('dark',probe);
      assert.equal(await probe.evaluate(key=>localStorage.getItem(key),themeKey),'dark');
      await probe.emulateMedia({colorScheme:'light'});await probe.reload();await assertTheme('dark',probe);
    } finally {await context.close();}
  });
  await test('theme:system-preference-without-saved-choice', async () => {
    const context=await browser.newContext({colorScheme:'light',reducedMotion:'reduce'});
    try {
      const probe=await context.newPage();observeErrors(probe);await probe.goto(base+'/portfolio.html',{waitUntil:'domcontentloaded'});await assertTheme('light',probe);
      assert.equal(await probe.evaluate(key=>localStorage.getItem(key),themeKey),null,'System fallback must not become an explicit stored choice');
      await probe.emulateMedia({colorScheme:'dark'});await assertTheme('dark',probe);
      await probe.emulateMedia({colorScheme:'light'});await assertTheme('light',probe);
      await probe.reload();await assertTheme('light',probe);
    } finally {await context.close();}
  });
  await test('theme:invalid-stored-values-use-system', async () => {
    for(const value of ['sepia','LIGHT','<svg onload=alert(1)>']) {
      const context=await browser.newContext({colorScheme:'light',reducedMotion:'reduce'});
      try {
        await context.addInitScript(({key,value})=>localStorage.setItem(key,value),{key:themeKey,value});
        const probe=await context.newPage();observeErrors(probe);await probe.goto(base+'/services.html');await assertTheme('light',probe);
        await probe.emulateMedia({colorScheme:'dark'});await assertTheme('dark',probe);
        assert.ok(['dark','light'].includes(await probe.locator('html').getAttribute('data-theme')));
      } finally {await context.close();}
    }
  });
  await test('theme:storage-denied-keeps-local-toggle-usable', async () => {
    const context=await browser.newContext({colorScheme:'light',reducedMotion:'reduce'});
    try {
      await context.addInitScript(()=>{for(const name of ['getItem','setItem'])Storage.prototype[name]=function(){throw new DOMException('Test storage access denied','SecurityError');};});
      const probe=await context.newPage();observeErrors(probe);await probe.goto(base+'/');await assertTheme('light',probe);
      await probe.locator('.theme-toggle').click();await assertTheme('dark',probe);await layout(probe);
      await probe.reload();await assertTheme('light',probe);
      await probe.locator('.theme-toggle').click();await assertTheme('dark',probe);
      await probe.getByRole('navigation',{name:'Основная навигация'}).getByRole('link',{name:'Проекты',exact:true}).click();
      await assertTheme('light',probe);assert.equal(await probe.locator('.portfolio-card').count(),76);
    } finally {await context.close();}
  });
  await themeTest('theme:keyboard-control-focus-and-no-extra-footer', async (theme) => {
    for(const width of [375,1440]) {
      await page.setViewportSize({width,height:1000});await load('/');await assertTheme(theme);
      const button=page.locator('.theme-toggle');await button.focus();await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');
      assert.ok(await button.evaluate(e=>e===document.activeElement));
      const focus=await button.evaluate(e=>{const s=getComputedStyle(e);return {outline:s.outlineStyle,width:parseFloat(s.outlineWidth),shadow:s.boxShadow};});
      assert.ok((focus.outline!=='none'&&focus.width>=1)||focus.shadow!=='none','Keyboard focus must have a visible indicator');
      await page.keyboard.press('Space');await assertTheme(theme==='dark'?'light':'dark');
      assert.ok(await button.evaluate(e=>e===document.activeElement),'Theme change must preserve focus');
      await page.keyboard.press('Enter');await assertTheme(theme);
      assert.equal(await page.locator('.motion-toggle').count(),0);
      assert.ok(!/©|Возобновить анимации|Приостановить анимации/.test(await page.locator('footer').innerText()));
      await layout();
    }
  });
  await test('theme:distinct-surfaces-with-unfiltered-original-images', async () => {
    for(const route of ['/','/portfolio.html','/services.html']) {
      await load(route);const surfaces={};
      for(const theme of themes) {
        await chooseTheme(theme);
        surfaces[theme]=await page.evaluate(()=>{
          const color=e=>getComputedStyle(e).backgroundColor;
          return {body:color(document.body),header:color(document.querySelector('header')),card:color(document.querySelector('.portfolio-card,.svc-card')),filtered:[...document.querySelectorAll('html,body,main,main img,.portfolio-card,.svc-card')].filter(e=>getComputedStyle(e).filter.includes('invert(')).length};
        });
        assert.equal(surfaces[theme].filtered,0,'Light theme must not invert original media');
      }
      for(const key of ['body','header','card'])assert.notEqual(surfaces.dark[key],surfaces.light[key],`${route}: ${key} needs a real light surface`);
      metrics.push({route,themeSurfaces:surfaces});
    }
  });
  for(const scheme of themes) await test(`theme:no-JS:${scheme}:content-navigation-and-system-fallback`, async () => {
    const context=await browser.newContext({javaScriptEnabled:false,colorScheme:scheme,viewport:{width:320,height:1000}});
    try {
      const probe=await context.newPage();observeErrors(probe);
      for(const width of [320,1440]) for(const route of ['/','/portfolio.html','/services.html']) {
        await probe.setViewportSize({width,height:1000});await probe.goto(base+route);
        assert.equal(await probe.locator('.theme-toggle').count(),1);assert.equal(await probe.locator('.theme-toggle:visible').count(),0);
        assert.equal(await probe.locator('.motion-toggle').count(),0);assert.ok(!/©|Возобновить анимации|Приостановить анимации/.test(await probe.locator('footer').innerText()));
        assert.ok(await probe.getByRole('navigation',{name:'Основная навигация'}).isVisible());
        assert.equal(await probe.locator('h1').count(),1);await layout(probe);
        const background=await probe.evaluate(()=>{
          const raw=[getComputedStyle(document.body).backgroundColor,getComputedStyle(document.documentElement).backgroundColor].find(c=>!c.endsWith(', 0)')&&c!=='transparent');
          return raw?.match(/[\d.]+/g)?.slice(0,3).map(Number).reduce((sum,x)=>sum+x,0)/3;
        });
        assert.ok(Number.isFinite(background)&&(scheme==='light'?background>180:background<90),`${scheme} no-JS canvas: ${background}`);
        if(route==='/portfolio.html'){assert.equal(await probe.locator('.portfolio-card').count(),76);assert.equal(await probe.locator('.project-files summary:visible').count(),76);assert.equal(await probe.locator('.project-files a').count(),211);}
        if(route==='/services.html')assert.equal(await probe.locator('.svc').count(),8);
      }
    } finally {await context.close();}
  });
  await test('runtime:no-console-errors',async()=>assert.deepEqual(errors.filter(e=>!e.includes('404 (Not Found)')),[]));
})().catch(error=>{checks.push({name:'harness',status:'FAIL',reason:error.stack});}).finally(async()=>{
  if (checks.some(c=>c.status==='FAIL') && page && !page.isClosed()) await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});
  if(browser)await browser.close(); await new Promise(resolve=>instance.close(resolve));
  let revision='unavailable';try{revision=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();}catch{}
  const hashes={};for(const name of ['index.html','portfolio.html','services.html','theme.js','scripts.js','styles.css','tests/browser.cjs','pnpm-lock.yaml'])if(fs.existsSync(path.join(root,name)))hashes[name]=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,name))).digest('hex');
  const result={status:checks.length&&checks.every(c=>c.status==='PASS')?'PASS':'FAIL',revision,environment:{node:process.version,os:process.platform,architecture:process.arch,playwright:require('playwright/package.json').version,axe:require('axe-core/package.json').version,reducedMotion:'reduce'},checks,metrics,console:errors,source_hashes:hashes};
  fs.writeFileSync(path.join(out,only?'browser-targeted.json':'browser.json'),JSON.stringify(result,null,2));
  console.log(JSON.stringify({status:result.status,passed:checks.filter(c=>c.status==='PASS').length,failed:checks.filter(c=>c.status==='FAIL'),metrics}));
  process.exitCode=result.status==='PASS'?0:1;
});
